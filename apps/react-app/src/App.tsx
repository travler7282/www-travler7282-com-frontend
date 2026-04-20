import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Define the 6-servo joint state
interface ArmState {
  baseRotate: number;
  shoulderBend: number;
  elbowBend: number;
  wristBend: number;
  gripperRotate: number;
  gripperClaw: number; // 0 = Open, 100 = Closed
}

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

interface BLEDevice {
  name: string;
  address: string;
}

interface CharacteristicInfo {
  uuid: string;
  handle: number | null;
}

interface RawServiceInfo {
  uuid: string;
  characteristics: Array<string | { uuid: string; handle: number }>;
}

interface ServiceInfo {
  uuid: string;
  characteristics: CharacteristicInfo[];
}

interface WsInboundMessage {
  type: string;
  message?: string;
  payload?: string;
  services?: RawServiceInfo[];
}

type BackendPreset = 'current' | 'dev' | 'local' | 'custom';

const App: React.FC = () => {
  const currentHostDefault = useMemo(() => {
    const protocol = window.location.protocol;
    const host = window.location.hostname;

    if (host === 'www.travler7282.com' || host === 'travler7282.com') {
      return `${protocol}//api.travler7282.com/roboarm/api/v1`;
    }

    if (host === 'dev.travler7282.com') {
      return `${protocol}//dev-api.travler7282.com/roboarm/api/v1`;
    }

    return `${protocol}//${window.location.host}/roboarm/api/v1`;
  }, []);

  const envDefault = useMemo(() => {
    const fromEnv = import.meta.env.VITE_ROBOARM_API_BASE;
    if (fromEnv) {
      return String(fromEnv).replace(/\/$/, '');
    }
    return currentHostDefault;
  }, [currentHostDefault]);

  const [backendPreset, setBackendPreset] = useState<BackendPreset>('custom');
  const [backendBaseUrl, setBackendBaseUrl] = useState<string>(envDefault);
  const [customBackendUrl, setCustomBackendUrl] = useState<string>(envDefault);
  const [cameraTick, setCameraTick] = useState<number>(Date.now());
  const [cameraError, setCameraError] = useState<boolean>(false);

  const presetUrlMap = useMemo(
    () => ({
      current: currentHostDefault,
      dev: 'https://dev-api.travler7282.com/roboarm/api/v1',
      local: 'http://127.0.0.1:8000',
    }),
    [currentHostDefault],
  );

  const backendWsUrl = useMemo(() => {
    const url = new URL(`${backendBaseUrl}/ws/terminal`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }, [backendBaseUrl]);

  const cameraFrameUrl = useMemo(
    () => `${backendBaseUrl}/camera/frame?tick=${cameraTick}`,
    [backendBaseUrl, cameraTick],
  );

  const wsRef = useRef<WebSocket | null>(null);

  const [joints, setJoints] = useState<ArmState>({
    baseRotate: 90,
    shoulderBend: 90,
    elbowBend: 90,
    wristBend: 90,
    gripperRotate: 90,
    gripperClaw: 20,
  });

  const [status, setStatus] = useState<string>("System Online");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [txHandle, setTxHandle] = useState<number | null>(null);
  const [rxHandle, setRxHandle] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [hexPayload, setHexPayload] = useState<string>('');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'RoboArm terminal ready.',
  ]);

  const switchPreset = (preset: BackendPreset) => {
    setBackendPreset(preset);
    if (preset === 'custom') {
      return;
    }

    const nextUrl = presetUrlMap[preset];
    setBackendBaseUrl(nextUrl);
    setCustomBackendUrl(nextUrl);
    setServices([]);
    setDevices([]);
    setSelectedAddress('');
    setTxHandle(null);
    setRxHandle(null);
    setCameraError(false);
  };

  const applyCustomUrl = () => {
    const normalized = customBackendUrl.trim().replace(/\/$/, '');
    if (!normalized) {
      return;
    }
    setBackendPreset('custom');
    setBackendBaseUrl(normalized);
    setServices([]);
    setDevices([]);
    setSelectedAddress('');
    setTxHandle(null);
    setRxHandle(null);
    setCameraError(false);
  };

  const appendTerminal = (line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLines((prev) => [...prev.slice(-79), `[${timestamp}] ${line}`]);
  };

  const normalizeServices = (rawServices: RawServiceInfo[]): ServiceInfo[] => {
    return rawServices.map((service) => ({
      uuid: service.uuid,
      characteristics: service.characteristics.map((characteristic) => {
        if (typeof characteristic === 'string') {
          return { uuid: characteristic, handle: null };
        }
        return {
          uuid: characteristic.uuid,
          handle: Number.isInteger(characteristic.handle) ? characteristic.handle : null,
        };
      }),
    }));
  };

  const parseMessage = (raw: string): WsInboundMessage | null => {
    try {
      return JSON.parse(raw) as WsInboundMessage;
    } catch {
      appendTerminal(`Invalid WS message: ${raw}`);
      return null;
    }
  };

  const connectSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
      appendTerminal('Closing existing websocket connection');
    }

    const ws = new WebSocket(backendWsUrl);
    wsRef.current = ws;
    appendTerminal(`Connecting websocket to ${backendWsUrl}`);

    ws.onopen = () => {
      setWsConnected(true);
      setStatus('WebSocket connected');
      appendTerminal('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = parseMessage(String(event.data));
      if (!message) {
        return;
      }

      if (message.type === 'rx_data' && message.payload) {
        appendTerminal(`RX ${message.payload}`);
        return;
      }

      if (message.type === 'status') {
        if (message.message) {
          setStatus(message.message);
          appendTerminal(`STATUS ${message.message}`);
        }
        if (Array.isArray(message.services)) {
          const normalizedServices = normalizeServices(message.services);
          setServices(normalizedServices);
          const chars = normalizedServices.flatMap((service) => service.characteristics);
          const firstWithHandle = chars.find((char) => char.handle !== null);
          const secondWithHandle = chars.filter((char) => char.handle !== null)[1] ?? firstWithHandle;

          if (txHandle === null && firstWithHandle?.handle !== null) {
            setTxHandle(firstWithHandle.handle);
          }
          if (rxHandle === null && secondWithHandle?.handle !== null) {
            setRxHandle(secondWithHandle.handle);
          }
        }
        return;
      }

      if (message.type === 'error') {
        const errorMessage = message.message ?? 'Unknown backend error';
        setStatus(`Error: ${errorMessage}`);
        appendTerminal(`ERROR ${errorMessage}`);
        return;
      }

      appendTerminal(`WS ${JSON.stringify(message)}`);
    };

    ws.onclose = () => {
      setWsConnected(false);
      appendTerminal('WebSocket disconnected');
    };

    ws.onerror = () => {
      setStatus('WebSocket error');
      appendTerminal('WebSocket error');
    };
  };

  const sendSocketMessage = (payload: Record<string, string | number>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setStatus('WebSocket is not connected');
      appendTerminal('ERROR websocket not connected');
      return false;
    }
    wsRef.current.send(JSON.stringify(payload));
    return true;
  };

  const scanDevices = async () => {
    setScanLoading(true);
    try {
      const response = await fetch(`${backendBaseUrl}/scan`);
      if (!response.ok) {
        throw new Error(`Scan failed with ${response.status}`);
      }
      const nextDevices = (await response.json()) as BLEDevice[];
      setDevices(nextDevices);
      if (nextDevices.length > 0 && !selectedAddress) {
        setSelectedAddress(nextDevices[0].address);
      }
      setStatus(`Scan complete (${nextDevices.length} device${nextDevices.length === 1 ? '' : 's'})`);
      appendTerminal(`Scan complete: ${nextDevices.length} device(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scan error';
      setStatus(`Scan error: ${message}`);
      appendTerminal(`ERROR scan ${message}`);
    } finally {
      setScanLoading(false);
    }
  };

  const connectBleDevice = () => {
    if (!selectedAddress) {
      setStatus('Select a BLE device first');
      return;
    }
    if (sendSocketMessage({ action: 'connect', address: selectedAddress })) {
      appendTerminal(`Connecting BLE device ${selectedAddress}`);
    }
  };

  const configureIo = () => {
    if (txHandle === null || rxHandle === null) {
      setStatus('Please select both TX and RX characteristics');
      appendTerminal('ERROR both TX and RX handles must be selected');
      return;
    }
    if (sendSocketMessage({ action: 'select_io', tx_handle: txHandle, rx_handle: rxHandle })) {
      appendTerminal(`Configuring I/O (TX handle ${txHandle} / RX handle ${rxHandle})`);
    }
  };

  const sendHexCommand = () => {
    if (!hexPayload.trim()) {
      return;
    }
    if (sendSocketMessage({ action: 'send_hex', payload: hexPayload.trim() })) {
      appendTerminal(`TX ${hexPayload.trim()}`);
      setHexPayload('');
    }
  };

  // Mock function to simulate sending commands to hardware
  const handleUpdate = (joint: keyof ArmState, value: number) => {
    setJoints(prev => ({ ...prev, [joint]: value }));
    setIsSyncing(true);
    setStatus(`Moving ${joint.replace(/([A-Z])/g, ' $1').toLowerCase()} to ${value}...`);
  };

  // Reset to home position
  const homeArm = () => {
    setJoints({
      baseRotate: 90,
      shoulderBend: 90,
      elbowBend: 90,
      wristBend: 90,
      gripperRotate: 90,
      gripperClaw: 0
    });
    setStatus("Homing sequence initiated...");
  };

  // Clear syncing indicator after a short delay
  useEffect(() => {
    if (isSyncing) {
      const timeout = setTimeout(() => setIsSyncing(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isSyncing]);

  useEffect(() => {
    connectSocket();
    void scanDevices();

    const interval = window.setInterval(() => {
      setCameraTick(Date.now());
    }, 1500);

    return () => {
      window.clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // Trigger reconnection and camera refresh when backend target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendBaseUrl]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="app-title">RoboArm Controller</h1>
          <div className="status-row">
            <div className={`status-dot ${isSyncing ? 'status-dot-busy' : 'status-dot-ready'}`} />
            <span className="status-text">LAB_ARM_01: {isSyncing ? 'BUSY' : 'READY'}</span>
          </div>
          <div className="backend-row">
            <span className={`ws-pill ${wsConnected ? 'ws-pill-up' : 'ws-pill-down'}`}>
              WS {wsConnected ? 'UP' : 'DOWN'}
            </span>
            <span className="backend-url">{backendBaseUrl}</span>
          </div>
        </div>
        <button onClick={homeArm} className="home-button">Home Arm</button>
      </header>

      <main className="app-layout">
        {/* Left Side: Camera Feed */}
        <section className="camera-section">
          <div className="camera-frame">
            <div className="camera-overlay">
              <div className="live-tag"><span className="pulse" /> LIVE FEED</div>
              <div className="timestamp">{new Date().toLocaleTimeString()}</div>
            </div>
            <img
              src={cameraFrameUrl}
              alt="RoboArm backend camera feed"
              className="camera-feed"
              onLoad={() => setCameraError(false)}
              onError={() => setCameraError(true)}
            />
            {cameraError ? (
              <div className="camera-error-banner">Camera feed unavailable from backend.</div>
            ) : null}
          </div>
          <div className="terminal">
            <div className="terminal-head">
              <span className="terminal-prefix">{'>'}</span> {status}
            </div>
            <div className="terminal-log" role="log" aria-live="polite">
              {terminalLines.map((line, idx) => (
                <div key={`${line}-${idx}`}>{line}</div>
              ))}
            </div>
            <div className="terminal-send">
              <input
                value={hexPayload}
                onChange={(e) => setHexPayload(e.target.value)}
                placeholder="Hex payload (e.g. AA 55 10 00)"
                className="terminal-input"
              />
              <button type="button" onClick={sendHexCommand} className="terminal-button">
                Send Hex
              </button>
            </div>
          </div>
        </section>

        {/* Right Side: Remote Controls */}
        <aside className="control-panel">
          <h2 className="panel-title">Manual Control</h2>

          <div className="control-group">
            <h3 className="group-label">Backend Link</h3>
            <div className="device-actions">
              <button type="button" className="action-button" onClick={connectSocket}>
                Reconnect WS
              </button>
              <button type="button" className="action-button" onClick={() => void scanDevices()} disabled={scanLoading}>
                {scanLoading ? 'Scanning...' : 'Scan Devices'}
              </button>
            </div>

            <label className="field-label" htmlFor="backend-preset">Backend Preset</label>
            <select
              id="backend-preset"
              className="field-input"
              value={backendPreset}
              onChange={(e) => switchPreset(e.target.value as BackendPreset)}
            >
              <option value="current">Current Host</option>
              <option value="dev">Dev API Host</option>
              <option value="local">Local Backend</option>
              <option value="custom">Custom URL</option>
            </select>

            <label className="field-label" htmlFor="custom-backend-url">Backend URL</label>
            <div className="url-row">
              <input
                id="custom-backend-url"
                className="field-input"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                placeholder="https://dev-api.travler7282.com/roboarm/api/v1"
              />
              <button type="button" className="action-button" onClick={applyCustomUrl}>
                Apply
              </button>
            </div>

            <label className="field-label" htmlFor="ble-address">Device</label>
            <select
              id="ble-address"
              className="field-input"
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
            >
              <option value="">Select BLE device</option>
              {devices.map((device) => (
                <option key={device.address} value={device.address}>
                  {device.name} ({device.address})
                </option>
              ))}
            </select>
            <button type="button" className="action-button action-button-wide" onClick={connectBleDevice}>
              Connect Device
            </button>

            <label className="field-label" htmlFor="tx-handle">TX Handle</label>
            <input
              id="tx-handle"
              className="field-input"
              value={txHandle ?? ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                setTxHandle(val ? parseInt(val, 10) : null);
              }}
              placeholder="Characteristic handle for writes"
            />

            <label className="field-label" htmlFor="rx-handle">RX Handle</label>
            <input
              id="rx-handle"
              className="field-input"
              value={rxHandle ?? ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                setRxHandle(val ? parseInt(val, 10) : null);
              }}
              placeholder="Characteristic handle for notifications"
            />

            <button type="button" className="action-button action-button-wide" onClick={configureIo}>
              Configure I/O
            </button>

            {services.length > 0 ? (
              <div className="service-list">
                <div className="service-title">Discovered Services</div>
                {services.map((service) => (
                  <div className="service-item" key={service.uuid}>
                    <div className="service-uuid">{service.uuid}</div>
                    {service.characteristics.map((characteristic, index) => (
                      <button
                        key={`${service.uuid}-${characteristic.uuid}-${characteristic.handle ?? index}`}
                        type="button"
                        className="chip-button"
                        onClick={() => {
                          if (characteristic.handle === null) {
                            appendTerminal(`Characteristic ${characteristic.uuid} has no numeric handle in payload`);
                            return;
                          }
                          setTxHandle(characteristic.handle);
                          setRxHandle(characteristic.handle);
                        }}
                      >
                        {characteristic.uuid}
                        {characteristic.handle !== null ? ` (h:${characteristic.handle})` : ''}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="control-group">
            <h3 className="group-label">Base Control</h3>
            <ControlSlider label="Rotation" value={joints.baseRotate} onChange={(v: number) => handleUpdate('baseRotate', v)} />
          </div>

          <div className="control-group">
            <h3 className="group-label">Arm Linkage</h3>
            <ControlSlider label="Shoulder" value={joints.shoulderBend} onChange={(v: number) => handleUpdate('shoulderBend', v)} />
            <ControlSlider label="Elbow" value={joints.elbowBend} onChange={(v: number) => handleUpdate('elbowBend', v)} />
            <ControlSlider label="Wrist" value={joints.wristBend} onChange={(v: number) => handleUpdate('wristBend', v)} />
          </div>

          <div className="control-group">
            <h3 className="group-label">End Effector</h3>
            <ControlSlider label="Grip Rotate" value={joints.gripperRotate} onChange={(v: number) => handleUpdate('gripperRotate', v)} />
            <ControlSlider label="Gripper Claw" value={joints.gripperClaw} max={100} unit="%" onChange={(v: number) => handleUpdate('gripperClaw', v)} />
          </div>
        </aside>
      </main>
    </div>
  );
};

// Reusable Control Component
const ControlSlider: React.FC<ControlSliderProps> = ({ label, value, onChange, min = 0, max = 180, unit = "°" }) => {
  const inputId = `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
  <div className="slider-row">
    <div className="slider-header">
      <label className="slider-label" htmlFor={inputId}>{label}</label>
      <span className="value-readout">{value}{unit}</span>
    </div>
    <input
      id={inputId}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="slider-input"
      title={`${label} control`}
      aria-label={label}
    />
  </div>
  );
};

export default App;
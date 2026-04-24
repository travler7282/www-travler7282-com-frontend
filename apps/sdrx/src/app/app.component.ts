import { DecimalPipe, NgClass } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { SdrApiService, type SdrStatus } from './sdr-api.service';
import { getRuntimeConfig } from './runtime-config';

type MarkerDragMode = 'move' | 'resize-left' | 'resize-right' | null;

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('spectrumCanvas') private spectrumCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('waterfallCanvas') private waterfallCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('spectrumWrap') private spectrumWrap?: ElementRef<HTMLDivElement>;

  protected readonly minFrequencyHz = 118000000;
  protected readonly maxFrequencyHz = 470000000;
  protected readonly captureBandwidthKhz = 2400;
  protected readonly modes = ['LSB', 'USB', 'AM', 'FM', 'WFM', 'DSB'];

  protected frequencyHz = 144390000;
  protected selectedMode = 'FM';
  protected bandwidthKhz = 16;
  protected gainDb = 24;
  protected squelchDb = 12;

  protected readonly demodulators = [
    { name: 'Audio Monitor', active: true },
    { name: 'APRS Decoder', active: false },
    { name: 'Signal Logger', active: false }
  ];
  protected isMarkerDragging = false;
  protected backendConnected = false;
  protected backendApiUrl = getRuntimeConfig().apiBaseUrl || '(same-origin)';
  protected backendMessage = 'Waiting for backend status...';

  protected get markerWidthPct(): number {
    const ratio = this.bandwidthKhz / this.captureBandwidthKhz;
    return Math.max(0.5, Math.min(98, ratio * 100));
  }

  protected get markerLeftPct(): number {
    const frequencySpan = this.maxFrequencyHz - this.minFrequencyHz;
    const centerRatio = (this.frequencyHz - this.minFrequencyHz) / frequencySpan;
    const left = centerRatio * 100 - this.markerWidthPct / 2;
    return Math.max(0, Math.min(100 - this.markerWidthPct, left));
  }

  private frameId = 0;
  private tick = 0;
  private dragMode: MarkerDragMode = null;
  private activePointerId: number | null = null;
  private readonly onResize = () => this.resizeCanvases();
  private readonly minBandwidthKhz = 1;
  private readonly maxBandwidthKhz = 220;
  private readonly sdrApi = inject(SdrApiService);
  private tuneSyncTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.resizeCanvases();
    window.addEventListener('resize', this.onResize);
    this.loadBackendStatus();
    this.drawLoop();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.tuneSyncTimer) {
      clearTimeout(this.tuneSyncTimer);
    }
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }

  protected selectMode(mode: string): void {
    this.selectedMode = mode;
    if (mode === 'WFM' && this.bandwidthKhz < 120) {
      this.bandwidthKhz = 120;
    }
    if (mode !== 'WFM' && this.bandwidthKhz > 40) {
      this.bandwidthKhz = 16;
    }
    this.scheduleTuneSync();
  }

  protected nudgeFrequency(deltaKhz: number): void {
    this.frequencyHz = Math.max(
      this.minFrequencyHz,
      Math.min(this.maxFrequencyHz, this.frequencyHz + deltaKhz * 1000)
    );
    this.scheduleTuneSync();
  }

  protected clampFrequency(): void {
    this.frequencyHz = Math.max(this.minFrequencyHz, Math.min(this.maxFrequencyHz, this.frequencyHz));
    this.scheduleTuneSync();
  }

  protected onFrequencyInput(event: Event): void {
    this.frequencyHz = +((event.target as HTMLInputElement).value);
    this.scheduleTuneSync();
  }

  protected onBandwidthInput(event: Event): void {
    this.bandwidthKhz = +((event.target as HTMLInputElement).value);
    this.scheduleTuneSync();
  }

  protected onGainInput(event: Event): void {
    this.gainDb = +((event.target as HTMLInputElement).value);
    this.scheduleTuneSync();
  }

  protected onSquelchInput(event: Event): void {
    this.squelchDb = +((event.target as HTMLInputElement).value);
  }

  protected onSpectrumPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.dragMode) {
      return;
    }

    const marker = event.target as HTMLElement | null;
    if (marker?.closest('.bandwidth-marker')) {
      return;
    }

    const wrap = this.spectrumWrap?.nativeElement;
    if (!wrap) {
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const pointerPct = ((event.clientX - rect.left) / rect.width) * 100;
    const clampedPct = Math.max(0, Math.min(100, pointerPct));
    this.frequencyHz = this.percentageToFrequency(clampedPct);
    this.scheduleTuneSync();
  }

  protected onSpectrumWheel(event: WheelEvent): void {
    event.preventDefault();
    const stepKhz = event.shiftKey ? 25 : 5;
    const direction = event.deltaY < 0 ? 1 : -1;
    this.nudgeFrequency(direction * stepKhz);
  }

  protected startMarkerMove(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.beginMarkerInteraction(event, 'move');
  }

  protected startMarkerResize(event: PointerEvent, side: 'left' | 'right'): void {
    event.preventDefault();
    event.stopPropagation();
    this.beginMarkerInteraction(event, side === 'left' ? 'resize-left' : 'resize-right');
  }

  protected toggleDemodulator(name: string): void {
    const demodulator = this.demodulators.find((item) => item.name === name);
    if (demodulator) {
      demodulator.active = !demodulator.active;
    }
  }

  private beginMarkerInteraction(event: PointerEvent, mode: Exclude<MarkerDragMode, null>): void {
    this.dragMode = mode;
    this.activePointerId = event.pointerId;
    this.isMarkerDragging = true;

    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);

    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragMode || this.activePointerId !== event.pointerId) {
      return;
    }

    const wrap = this.spectrumWrap?.nativeElement;
    if (!wrap) {
      return;
    }

    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const pointerPct = ((event.clientX - rect.left) / rect.width) * 100;
    const clampedPointerPct = Math.max(0, Math.min(100, pointerPct));
    const currentLeftPct = this.markerLeftPct;
    const currentRightPct = currentLeftPct + this.markerWidthPct;

    if (this.dragMode === 'move') {
      const centerPct = Math.max(
        this.markerWidthPct / 2,
        Math.min(100 - this.markerWidthPct / 2, clampedPointerPct)
      );
      this.frequencyHz = this.percentageToFrequency(centerPct);
      return;
    }

    if (this.dragMode === 'resize-left') {
      const newLeftPct = Math.max(0, Math.min(currentRightPct - this.bandwidthKhzToWidthPct(this.minBandwidthKhz), clampedPointerPct));
      this.applyMarkerBounds(newLeftPct, currentRightPct);
      return;
    }

    const newRightPct = Math.min(100, Math.max(currentLeftPct + this.bandwidthKhzToWidthPct(this.minBandwidthKhz), clampedPointerPct));
    this.applyMarkerBounds(currentLeftPct, newRightPct);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.dragMode = null;
    this.activePointerId = null;
    this.isMarkerDragging = false;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  };

  private applyMarkerBounds(leftPct: number, rightPct: number): void {
    const widthPct = Math.max(this.bandwidthKhzToWidthPct(this.minBandwidthKhz), rightPct - leftPct);
    const centerPct = leftPct + widthPct / 2;
    const nextBandwidth = this.widthPctToBandwidthKhz(widthPct);
    this.bandwidthKhz = Math.max(this.minBandwidthKhz, Math.min(this.maxBandwidthKhz, nextBandwidth));
    this.frequencyHz = this.percentageToFrequency(centerPct);
    this.scheduleTuneSync();
  }

  private loadBackendStatus(): void {
    this.sdrApi.getStatus().subscribe({
      next: (status) => {
        this.applyBackendStatus(status, true);
        this.backendConnected = true;
        this.backendMessage = `Status loaded at ${new Date().toLocaleTimeString()}`;
      },
      error: () => {
        this.backendConnected = false;
        this.backendMessage = 'Backend unavailable. UI changes will retry when API is reachable.';
      }
    });
  }

  private scheduleTuneSync(): void {
    if (this.tuneSyncTimer) {
      clearTimeout(this.tuneSyncTimer);
    }

    this.tuneSyncTimer = setTimeout(() => {
      this.pushTuneUpdate();
    }, 180);
  }

  private pushTuneUpdate(): void {
    this.sdrApi.tune({
      frequencyHz: Math.round(this.frequencyHz),
      bandwidthHz: Math.round(this.bandwidthKhz * 1000),
      gainDb: Math.round(this.gainDb),
      mode: this.toBackendMode(this.selectedMode)
    }).subscribe({
      next: (status) => {
        this.applyBackendStatus(status, false);
        this.backendConnected = true;
        this.backendMessage = `Synced at ${new Date().toLocaleTimeString()}`;
      },
      error: () => {
        this.backendConnected = false;
        this.backendMessage = 'Sync failed. Check backend URL/runtime-config.js and API availability.';
      }
    });
  }

  private applyBackendStatus(status: SdrStatus, updateMode: boolean): void {
    this.frequencyHz = status.frequencyHz;
    this.bandwidthKhz = Math.max(this.minBandwidthKhz, Math.min(this.maxBandwidthKhz, Math.round(status.bandwidthHz / 1000)));
    this.gainDb = status.gainDb;

    if (updateMode && this.modes.includes(status.mode)) {
      this.selectedMode = status.mode;
    }
  }

  private toBackendMode(mode: string): 'AM' | 'FM' | 'USB' | 'LSB' | 'CW' {
    if (mode === 'WFM' || mode === 'DSB') {
      return 'FM';
    }

    if (mode === 'AM' || mode === 'FM' || mode === 'USB' || mode === 'LSB' || mode === 'CW') {
      return mode;
    }

    return 'FM';
  }

  private percentageToFrequency(percentage: number): number {
    const frequencySpan = this.maxFrequencyHz - this.minFrequencyHz;
    const ratio = percentage / 100;
    return Math.round(this.minFrequencyHz + ratio * frequencySpan);
  }

  private bandwidthKhzToWidthPct(bandwidthKhz: number): number {
    return (bandwidthKhz / this.captureBandwidthKhz) * 100;
  }

  private widthPctToBandwidthKhz(widthPct: number): number {
    return Math.round((widthPct / 100) * this.captureBandwidthKhz);
  }

  private resizeCanvases(): void {
    this.resizeCanvas(this.spectrumCanvas?.nativeElement);
    this.resizeCanvas(this.waterfallCanvas?.nativeElement);
  }

  private resizeCanvas(canvas?: HTMLCanvasElement): void {
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  private drawLoop = (): void => {
    const spectrumCanvas = this.spectrumCanvas?.nativeElement;
    const waterfallCanvas = this.waterfallCanvas?.nativeElement;

    if (!spectrumCanvas || !waterfallCanvas) {
      this.frameId = requestAnimationFrame(this.drawLoop);
      return;
    }

    const spectrumCtx = spectrumCanvas.getContext('2d');
    const waterfallCtx = waterfallCanvas.getContext('2d');
    if (!spectrumCtx || !waterfallCtx) {
      this.frameId = requestAnimationFrame(this.drawLoop);
      return;
    }

    this.renderSpectrum(spectrumCtx, spectrumCanvas.width, spectrumCanvas.height);
    this.renderWaterfall(waterfallCtx, waterfallCanvas.width, waterfallCanvas.height);

    this.tick += 1;
    this.frameId = requestAnimationFrame(this.drawLoop);
  };

  private renderSpectrum(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#04050b';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(82, 255, 193, 0.18)';
    ctx.lineWidth = 1;
    for (let row = 1; row < 5; row += 1) {
      const y = (height / 5) * row;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = width * ((this.frequencyHz - this.minFrequencyHz) / (this.maxFrequencyHz - this.minFrequencyHz));
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 170, 67, 0.75)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4bffd6';
    for (let x = 0; x < width; x += 2) {
      const normalized = x / width;
      const distance = Math.abs(normalized - (centerX / width));
      const peak = Math.exp(-distance * 24) * 0.65;
      const motion = (Math.sin((x + this.tick * 4) * 0.02) + 1) * 0.08;
      const noise = Math.abs(Math.sin((x * 17 + this.tick * 13) * 0.005)) * 0.1;
      const value = Math.min(0.96, 0.08 + peak + motion + noise);
      const y = height - value * height;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private renderWaterfall(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (height <= 1 || width <= 1) {
      return;
    }

    ctx.drawImage(ctx.canvas, 0, 0, width, height - 1, 0, 1, width, height - 1);

    const row = ctx.createImageData(width, 1);
    const center = width * ((this.frequencyHz - this.minFrequencyHz) / (this.maxFrequencyHz - this.minFrequencyHz));

    for (let x = 0; x < width; x += 1) {
      const offset = Math.abs((x - center) / width);
      const carrier = Math.exp(-offset * 26) * 0.7;
      const shimmer = (Math.sin((x * 0.02) + (this.tick * 0.06)) + 1) * 0.12;
      const floor = 0.06 + ((Math.sin((x * 0.11) + this.tick) + 1) * 0.04);
      const intensity = Math.min(1, floor + carrier + shimmer);

      const i = x * 4;
      row.data[i] = Math.min(255, intensity * 255);
      row.data[i + 1] = Math.min(255, intensity * 205);
      row.data[i + 2] = Math.min(255, 64 + intensity * 170);
      row.data[i + 3] = 255;
    }

    ctx.putImageData(row, 0, 0);
  }
}

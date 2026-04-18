import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { getRuntimeConfig } from './runtime-config';

export type SdrStatus = {
  frequencyHz: number;
  bandwidthHz: number;
  gainDb: number;
  sampleRateHz: number;
  mode: 'AM' | 'FM' | 'USB' | 'LSB' | 'CW';
  connected: boolean;
  updatedAt: string;
};

export type SdrTuneRequest = {
  frequencyHz: number;
  bandwidthHz: number;
  gainDb: number;
  mode: 'AM' | 'FM' | 'USB' | 'LSB' | 'CW';
};

@Injectable({ providedIn: 'root' })
export class SdrApiService {
  private readonly http = inject(HttpClient);
  private readonly config = getRuntimeConfig();

  private get baseUrl(): string {
    return this.config.apiBaseUrl;
  }

  getStatus(): Observable<SdrStatus> {
    return this.http.get<SdrStatus>(`${this.baseUrl}/api/sdr/status`);
  }

  tune(payload: SdrTuneRequest): Observable<SdrStatus> {
    return this.http.post<SdrStatus>(`${this.baseUrl}/api/sdr/tune`, payload);
  }
}

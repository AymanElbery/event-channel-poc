import { Injectable, signal } from '@angular/core';
import { Subscription, repeat, retry } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { changedFromDefaults } from '../models/form-diff';
import { FieldChange, FormValues } from '../models/form-schema';

export type ChannelStatus = 'disconnected' | 'connecting' | 'open';

export interface FormChangeMessage {
  type: 'form-change';
  timestamp: string;
  values: FormValues;
  changes: FieldChange[];
}

export interface ChannelAck {
  type: 'ack';
  receivedAt: string;
  changedFields: string[];
}

type ChannelMessage = FormChangeMessage | ChannelAck;

/**
 * Service B: keeps an open WebSocket to API B, detects which fields differ from the
 * defaults loaded by service A, and streams every form change over the channel.
 */
@Injectable({ providedIn: 'root' })
export class FormChannelService {
  readonly status = signal<ChannelStatus>('disconnected');
  readonly lastAck = signal<ChannelAck | null>(null);
  readonly changes = signal<FieldChange[]>([]);

  private socket?: WebSocketSubject<ChannelMessage>;
  private subscription?: Subscription;
  private defaults: FormValues = {};

  connect(url = FormChannelService.defaultUrl()): void {
    if (this.socket) return;
    this.status.set('connecting');
    this.socket = webSocket<ChannelMessage>({
      url,
      openObserver: { next: () => this.status.set('open') },
      // Fires asynchronously, so after disconnect() the socket is already gone.
      closeObserver: { next: () => this.socket && this.status.set('connecting') },
    });
    // Reconnect both on errors and on a clean close from the server.
    this.subscription = this.socket
      .pipe(retry({ delay: 2000 }), repeat({ delay: 2000 }))
      .subscribe((message) => {
        if (message.type === 'ack') this.lastAck.set(message);
      });
  }

  disconnect(): void {
    this.subscription?.unsubscribe();
    this.socket?.complete();
    this.socket = undefined;
    this.status.set('disconnected');
  }

  /** Records the defaults that came from service A; later changes are compared against them. */
  setDefaults(defaults: FormValues): void {
    this.defaults = { ...defaults };
    this.changes.set([]);
  }

  sendChange(values: FormValues): void {
    const changes = changedFromDefaults(this.defaults, values);
    this.changes.set(changes);
    this.socket?.next({ type: 'form-change', timestamp: new Date().toISOString(), values, changes });
  }

  private static defaultUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/ws/form-changes`;
  }
}

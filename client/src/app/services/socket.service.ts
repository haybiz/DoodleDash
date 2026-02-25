import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  hasGuessed: boolean;
}

export interface RoomState {
  id: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'round_end';
  currentWord: string; // The word (might be empty/hidden for guessers on frontend depending on backend logic)
  currentDrawer: string; // socket.id of drawer
  roundEndTime: number;
  roundTime: number;
  currentRound: number;
  totalRounds: number;
}

export interface ChatMessage {
  username?: string;
  message: string;
  system?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  // Render environment detection
  private get isProduction() { return window.location.hostname !== 'localhost'; }
  private readonly SERVER_URL = this.isProduction
    ? 'https://doodledash-server.onrender.com' // Replace this with your actual Render URL later
    : 'http://localhost:3000';

  public socketId$ = new BehaviorSubject<string>('');

  constructor() {
    this.socket = io(this.SERVER_URL);
    this.socket.on('connect', () => {
      this.socketId$.next(this.socket.id || '');
    });
  }

  joinRoom(roomId: string, username: string, avatar: string, action: 'create' | 'join') {
    this.socket.emit('join_room', { roomId, username, avatar, action });
  }

  onRoomError(): Observable<{ message: string }> {
    return new Observable(observer => {
      this.socket.on('room_error', (data) => observer.next(data));
    });
  }

  startGame(roomId: string, totalRounds: number) {
    this.socket.emit('start_game', { roomId, totalRounds });
  }

  // ==== Drawing Events ====
  sendDrawBatch(roomId: string, paths: any[]) {
    this.socket.emit('draw_batch', { roomId, paths });
  }

  onDrawBatch(): Observable<any[]> {
    return new Observable(observer => {
      this.socket.on('draw_batch', (paths: any[]) => observer.next(paths));
    });
  }

  clearCanvas(roomId: string) {
    this.socket.emit('clear_canvas', roomId);
  }

  onClearCanvas(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('clear_canvas', () => observer.next());
    });
  }

  undoAction(roomId: string, undoData: any) {
    this.socket.emit('undo_action', { roomId, ...undoData });
  }

  onUndoAction(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('undo_action', (data) => observer.next(data));
    });
  }

  // ==== Reactions ====
  sendReaction(roomId: string, emoji: string) {
    this.socket.emit('reaction', { roomId, emoji });
  }

  onReaction(): Observable<{ emoji: string, senderId: string }> {
    return new Observable(observer => {
      this.socket.on('reaction', (data) => observer.next(data));
    });
  }

  // ==== Game State Events ====
  onRoomStateUpdate(): Observable<RoomState> {
    return new Observable(observer => {
      this.socket.on('room_state_update', (state: RoomState) => observer.next(state));
    });
  }

  onYouAreDrawer(): Observable<{ word: string }> {
    return new Observable(observer => {
      this.socket.on('you_are_drawer', (data: { word: string }) => observer.next(data));
    });
  }

  // ==== Chat Events ====
  sendChat(roomId: string, message: string) {
    this.socket.emit('chat_message', { roomId, message });
  }

  onChat(): Observable<ChatMessage> {
    return new Observable(observer => {
      this.socket.on('chat_message', (data: ChatMessage) => observer.next(data));
    });
  }
}

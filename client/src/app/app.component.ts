import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CanvasComponent } from './components/canvas/canvas.component';
import { SocketService, Player, RoomState, ChatMessage } from './services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, CanvasComponent],
  template: `
    <main class="w-full h-full min-h-screen p-4 md:p-8 flex flex-col md:flex-row gap-6 bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-930 text-white relative">
      
      <!-- Waking Server Loading Screen -->
      <div *ngIf="!myId" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md">
        <div class="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 class="text-2xl font-bold text-slate-200 mb-2">Connecting to Server...</h2>
        <p class="text-slate-400 text-center max-w-sm px-4">
          If the Free Tier server is asleep, this might take up to 50 seconds to wake up the hamsters. Hang tight! 🐹
        </p>
      </div>

      <!-- Vivid Doodle Landing Page -->
      <div *ngIf="myId && !roomState.id" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-930 overflow-hidden w-full h-full font-sans">
        
        <!-- Background Decorative Blobs -->
        <div class="absolute inset-0 opacity-40 pointer-events-none">
           <div class="absolute -top-20 -left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
           <div class="absolute top-40 -right-20 w-[30rem] h-[30rem] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
           <div class="absolute -bottom-20 left-40 w-[24rem] h-[24rem] bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        </div>

        <!-- Main Card -->
        <div class="bg-white p-8 md:p-12 rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex flex-col gap-8 relative z-10 transform transition-all -rotate-1 hover:rotate-0">
          
          <div class="text-center">
             <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-2 drop-shadow-sm tracking-tighter" style="font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;">
              DoodleDash!
            </h1>
            <p class="text-slate-600 font-bold text-lg">The wildest drawing game on the web.</p>
          </div>

          <!-- Home View -->
          <div *ngIf="viewMode === 'home'" class="flex flex-col gap-4">
            <button (click)="showCreate()" class="w-full bg-cyan-400 hover:bg-cyan-300 text-black border-4 border-black font-black text-2xl py-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              🎨 Create Room
            </button>
            <button (click)="showJoin()" class="w-full bg-pink-400 hover:bg-pink-300 text-black border-4 border-black font-black text-2xl py-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              🤝 Join Room
            </button>
          </div>

          <!-- Create View -->
          <div *ngIf="viewMode === 'create'" class="flex flex-col gap-5">
            <div>
              <label class="text-lg font-black text-black mb-2 block uppercase tracking-wider">Your Nickname</label>
              <input [(ngModel)]="username" type="text" class="w-full bg-slate-100 border-4 border-black rounded-xl px-4 py-3 text-xl font-bold text-black placeholder-slate-400 focus:outline-none focus:bg-white transition-colors" placeholder="CoolArtist99">
            </div>
            <div>
              <label class="text-lg font-black text-black mb-2 block uppercase tracking-wider">Room Code</label>
              <div class="bg-yellow-200 border-4 border-black rounded-xl px-4 py-3 text-3xl font-black text-center tracking-widest uppercase">
                {{ roomIdInput }}
              </div>
              <p class="text-sm font-bold text-slate-500 mt-2 text-center">Share this code with your friends!</p>
            </div>
            <div class="flex gap-4 mt-2">
              <button (click)="backToHome()" class="w-1/3 bg-slate-200 hover:bg-slate-300 text-black border-4 border-black font-black text-lg py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                Back
              </button>
              <button (click)="joinRoom()" [disabled]="!username" class="w-2/3 bg-green-400 hover:bg-green-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black border-4 border-black font-black text-xl py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                 Let's Go! 🚀
              </button>
            </div>
          </div>

          <!-- Join View -->
          <div *ngIf="viewMode === 'join'" class="flex flex-col gap-5">
            <div>
              <label class="text-lg font-black text-black mb-2 block uppercase tracking-wider">Your Nickname</label>
              <input [(ngModel)]="username" type="text" class="w-full bg-slate-100 border-4 border-black rounded-xl px-4 py-3 text-xl font-bold text-black placeholder-slate-400 focus:outline-none focus:bg-white transition-colors" placeholder="CoolArtist99">
            </div>
            <div>
              <label class="text-lg font-black text-black mb-2 block uppercase tracking-wider">Room Code</label>
              <input [(ngModel)]="roomIdInput" maxlength="6" type="text" class="w-full bg-yellow-100 border-4 border-black rounded-xl px-4 py-3 text-2xl font-black text-black text-center uppercase tracking-widest placeholder-yellow-600/50 focus:outline-none focus:bg-yellow-50 transition-colors" placeholder="e.g. ABCD12">
            </div>
            
            <div *ngIf="errorMessage" class="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl font-bold text-center animate-pulse">
              {{ errorMessage }}
            </div>

            <div class="flex gap-4 mt-2">
              <button (click)="backToHome()" class="w-1/3 bg-slate-200 hover:bg-slate-300 text-black border-4 border-black font-black text-lg py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                Back
              </button>
              <button (click)="joinRoom()" [disabled]="!username || roomIdInput.length !== 6" class="w-2/3 bg-pink-400 hover:bg-pink-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black border-4 border-black font-black text-xl py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                Join Game ⚡
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Main Game View -->
      <ng-container *ngIf="roomState.id">
        <!-- Side Game Panel -->
        <div class="w-full md:w-64 flex flex-col gap-4 relative z-10">
          <!-- Logo Header -->
          <div class="bg-yellow-300 p-6 rounded-3xl flex flex-col items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-1 drop-shadow-sm tracking-tighter" style="font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;">
              DoodleDash!
            </h1>
            <p class="text-black font-bold text-xs uppercase tracking-widest">Room: {{ roomState.id }}</p>
          </div>

          <!-- Players List -->
          <div class="bg-white p-4 rounded-3xl flex-grow h-48 md:h-auto overflow-y-auto border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 class="text-sm font-black text-black mb-4 uppercase tracking-wider">Players</h3>
            <div class="flex flex-col gap-2">
              <div *ngFor="let p of sortedPlayers()" class="flex justify-between items-center p-3 rounded-2xl border-4 border-black text-black transition-all"
                   [ngClass]="{
                     'bg-green-300 translate-x-1': p.hasGuessed,
                     'bg-cyan-300 -translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]': p.id === roomState.currentDrawer,
                     'bg-slate-100': !p.hasGuessed && p.id !== roomState.currentDrawer
                   }">
                <div class="flex items-center gap-2">
                  <span class="font-black">{{ p.username }}</span>
                  <span *ngIf="p.id === roomState.currentDrawer" class="text-xs bg-white text-black px-2 py-0.5 rounded-full border-2 border-black font-bold">DRAW</span>
                </div>
                <span class="font-black font-mono text-xl">{{ p.score }}</span>
              </div>
            </div>
            
            <button *ngIf="roomState.status === 'waiting' && myId === roomState.players[0]?.id" 
                    (click)="startGame()"
                    class="w-full mt-4 bg-green-400 hover:bg-green-300 text-black font-black py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-lg">
              Start Game 🚀
            </button>
            <div *ngIf="roomState.status === 'waiting' && myId !== roomState.players[0]?.id" class="text-center font-bold text-slate-500 mt-4">
              Waiting for host to start...
            </div>
          </div>
        </div>

        <!-- Main Canvas Area -->
        <div class="flex-grow flex flex-col gap-4 relative z-10">
          <!-- Game Status Header -->
          <div class="bg-white p-4 rounded-3xl flex justify-between items-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            
            <div *ngIf="roomState.status === 'playing'" class="bg-pink-400 text-black border-4 border-black px-4 py-2 rounded-2xl font-black flex items-center min-w-[80px] justify-center text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-2">
              <span class="mr-2">⏱️</span> {{ timeLeft }}s
            </div>
            <div *ngIf="roomState.status !== 'playing'" class="px-4 py-2 font-black text-slate-400">
              ---
            </div>

            <!-- Current Word Display -->
            <div class="text-3xl font-black tracking-[0.2em] font-mono mx-4 flex flex-wrap gap-2 text-center justify-center flex-grow text-black uppercase">
              <ng-container *ngIf="roomState.status === 'playing'">
                <span *ngIf="isDrawer()" class="text-green-500 drop-shadow-sm">{{ drawerWord }}</span>
                <span *ngIf="!isDrawer() && !hasIGuessed()" class="text-slate-800 tracking-[0.4em]">{{ hiddenWord() }}</span>
                <span *ngIf="!isDrawer() && hasIGuessed()" class="text-green-500 drop-shadow-sm">{{ drawerWord }}</span>
              </ng-container>
              <ng-container *ngIf="roomState.status === 'waiting'">
                <span class="text-slate-400 text-xl tracking-normal">Waiting for players...</span>
              </ng-container>
              <ng-container *ngIf="roomState.status === 'round_end'">
                <span class="text-pink-500">Round Over!</span>
              </ng-container>
            </div>
          </div>

          <!-- Canvas Component -->
          <div class="flex-grow relative h-full min-h-[400px] overflow-hidden rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <app-canvas class="absolute inset-0" [roomId]="roomState.id" [isDrawer]="isDrawer()" [isWaiting]="roomState.status === 'waiting'"></app-canvas>
            
            <!-- Floating Reactions layer -->
            <div class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
               <div *ngFor="let r of activeReactions"
                    class="absolute bottom-0 text-5xl reaction-float drop-shadow-md"
                    [style.left.%]="r.left"
                    [style.animationDuration.ms]="r.animationDuration">
                 {{ r.emoji }}
               </div>
            </div>

            <!-- Reaction Buttons (floating near canvas bottom) -->
            <div *ngIf="roomState.id" class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-40 bg-white p-2 border-4 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
              <button *ngFor="let emoji of reactionEmojis" 
                      (click)="sendReaction(emoji)"
                      class="text-3xl hover:scale-125 transition-transform px-3 py-1 drop-shadow-sm">
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right Chat Panel -->
        <div class="w-full md:w-80 h-64 md:h-auto flex flex-col gap-0 bg-white rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-4 border-black z-10">
          <div class="bg-cyan-400 p-4 border-b-4 border-black flex justify-between items-center text-black">
            <h3 class="font-black text-xl uppercase tracking-wider">Live Chat 💬</h3>
          </div>
          
          <!-- Chat History -->
          <div class="flex-grow p-4 overflow-y-auto flex flex-col gap-2" #chatScroll (scroll)="onChatScroll()">
            <div *ngFor="let msg of chatHistory" class="text-sm font-bold">
              <ng-container *ngIf="msg.system">
                <span class="font-black px-3 py-1.5 rounded-xl w-full inline-block text-center border-2 border-black"
                      [ngClass]="{'bg-green-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]': msg.message.includes('guessed'), 'bg-slate-100 text-slate-500 border-dashed': !msg.message.includes('guessed')}">
                  {{ msg.message }}
                </span>
              </ng-container>
              <ng-container *ngIf="!msg.system">
                <span class="font-black text-black mr-2">{{ msg.username }}:</span>
                <span class="text-slate-800 break-words">{{ msg.message }}</span>
              </ng-container>
            </div>
          </div>

          <!-- Chat Input -->
          <div class="p-4 bg-slate-100 border-t-4 border-black">
            <input type="text" [(ngModel)]="currentMessage" (keyup.enter)="sendMessage()" 
                  [disabled]="!isChatEnabled()"
                  class="w-full bg-white border-4 border-black rounded-xl px-4 py-3 font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-0.5 transition-all text-black placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-200" 
                  [placeholder]="isDrawer() ? 'You are drawing!' : (hasIGuessed() ? 'You already guessed!' : 'Type your guess here...')">
          </div>
        </div>
      </ng-container>
    </main>
  `,
  styles: [`
    .logo-glow {
      text-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
    @keyframes floatUp {
      0% { transform: translateY(0) scale(0.5) rotate(-10deg); opacity: 0; }
      10% { opacity: 1; transform: translateY(-40px) scale(1.2) rotate(10deg); }
      100% { transform: translateY(-400px) scale(1) rotate(-20deg); opacity: 0; }
    }
    .reaction-float {
      animation: floatUp ease-out forwards;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  public viewMode: 'home' | 'create' | 'join' = 'home';
  public username = '';
  public roomIdInput = '';
  public errorMessage = '';

  public myId = '';
  public roomState: RoomState = { id: '', players: [], status: 'waiting', currentWord: '', currentDrawer: '', roundEndTime: 0, roundTime: 60000 };

  public drawerWord = '';
  public chatHistory: ChatMessage[] = [];
  public currentMessage = '';
  public timeLeft = 0;

  // Reactions
  public reactionEmojis = ['❤️', '😂', '🔥', '😮', '💀', '🎉'];
  public activeReactions: { id: number, emoji: string, left: number, animationDuration: number }[] = [];
  private reactionIdCounter = 0;

  private subs: Subscription[] = [];
  private timerInterval: any;

  constructor(private socketService: SocketService) { }

  ngOnInit() {
    this.subs.push(
      this.socketService.socketId$.subscribe(id => this.myId = id),

      this.socketService.onRoomError().subscribe(err => {
        this.errorMessage = err.message;
        this.roomState.id = ''; // Ensure we pop back to the landing page if it optimistic-rendered
      }),

      this.socketService.onRoomStateUpdate().subscribe(state => {
        this.errorMessage = ''; // Clear any previous errors on success
        this.roomState = state;
        if (state.status === 'playing') {
          // Sync word lengths
          if (!this.isDrawer() && !this.hasIGuessed() && state.currentWord) {
            this.drawerWord = state.currentWord; // Server sends it, we hide it via UI logic
          }
        }
      }),

      this.socketService.onYouAreDrawer().subscribe(data => {
        this.drawerWord = data.word;
      }),

      this.socketService.onChat().subscribe(msg => {
        this.chatHistory.push(msg);
        this.scrollToBottom();
      }),

      this.socketService.onReaction().subscribe(data => {
        this.triggerReaction(data.emoji);
      })
    );

    // Timer loop
    this.timerInterval = setInterval(() => {
      if (this.roomState.status === 'playing' && this.roomState.roundEndTime) {
        this.timeLeft = Math.max(0, Math.ceil((this.roomState.roundEndTime - Date.now()) / 1000));
      } else {
        this.timeLeft = 0;
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.timerInterval);
  }

  joinRoom() {
    if (this.username && this.roomIdInput && (this.viewMode === 'create' || this.viewMode === 'join')) {
      const formattedRoomId = this.roomIdInput.trim().toUpperCase();
      this.errorMessage = '';
      this.socketService.joinRoom(formattedRoomId, this.username, this.viewMode);
      // Removed optimistic UI setting of roomState.id so we wait for server confirmation
    }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.roomIdInput = result;
  }

  showCreate() {
    this.generateRoomCode();
    this.viewMode = 'create';
  }

  showJoin() {
    this.errorMessage = '';
    this.roomIdInput = '';
    this.viewMode = 'join';
  }

  backToHome() {
    this.errorMessage = '';
    this.viewMode = 'home';
  }

  startGame() {
    if (this.roomState.id) {
      this.socketService.startGame(this.roomState.id);
    }
  }

  sendMessage() {
    if (this.currentMessage.trim() && this.isChatEnabled()) {
      this.socketService.sendChat(this.roomState.id, this.currentMessage);
      this.currentMessage = '';
    }
  }

  // ==== Reactions ====
  sendReaction(emoji: string) {
    if (this.roomState.id) {
      this.triggerReaction(emoji); // Show instantly for myself
      this.socketService.sendReaction(this.roomState.id, emoji);
    }
  }

  triggerReaction(emoji: string) {
    const id = this.reactionIdCounter++;
    // Randomize starting position around the middle/bottom, and random speed
    const left = 30 + Math.random() * 40; // 30% to 70%
    const animationDuration = 1500 + Math.random() * 1000; // 1.5s to 2.5s

    this.activeReactions.push({ id, emoji, left, animationDuration });

    // Remove it after it floats away
    setTimeout(() => {
      this.activeReactions = this.activeReactions.filter(r => r.id !== id);
    }, animationDuration);
  }

  // Helpers
  isDrawer(): boolean {
    return this.myId === this.roomState.currentDrawer && this.roomState.status === 'playing';
  }

  hasIGuessed(): boolean {
    const me = this.roomState.players.find(p => p.id === this.myId);
    return me ? me.hasGuessed : false;
  }

  isChatEnabled(): boolean {
    return this.roomState.status === 'playing' && !this.isDrawer() && !this.hasIGuessed() || this.roomState.status === 'waiting';
  }

  hiddenWord(): string {
    // Return underscores matching word length, space separated
    if (!this.drawerWord) return 'WAITING...';
    return this.drawerWord.split('').map(char => char === ' ' ? '  ' : '_').join(' ');
  }

  sortedPlayers() {
    return [...this.roomState.players].sort((a, b) => b.score - a.score);
  }

  scrollToBottom() {
    // Quick hack to wait for DOM update
    setTimeout(() => {
      const chatScroll = document.querySelector('.overflow-y-auto') as HTMLElement;
      if (chatScroll) {
        chatScroll.scrollTop = chatScroll.scrollHeight;
      }
    }, 50);
  }

  onChatScroll() { }
}

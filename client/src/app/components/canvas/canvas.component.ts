import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawingService, Stroke } from '../../services/drawing.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() roomId: string = '';
  @Input() isDrawer: boolean = false;

  private isDrawing = false;
  private subs: Subscription[] = [];

  public colors = [
    '#0f172a', // erase/bg
    '#f8fafc', // white
    '#ef4444', // red
    '#3b82f6', // blue
    '#22c55e', // green
    '#eab308', // yellow
    '#d946ef', // purple
  ];

  constructor(
    public drawingService: DrawingService,
    private socketService: SocketService
  ) { }

  ngAfterViewInit() {
    this.initCanvasSize();
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (ctx) {
      this.drawingService.setContext(ctx);
    }

    // Subscribe to incoming socket events
    this.subs.push(
      this.socketService.onDrawBatch().subscribe(strokes => {
        // In local history, emit the stroke
        this.drawingService.drawStroke(strokes as any as Stroke);
      }),
      this.socketService.onClearCanvas().subscribe(() => {
        this.drawingService.clearCanvas(true);
      }),
      this.socketService.onUndoAction().subscribe(() => {
        this.drawingService.undo();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvasSize();
    this.drawingService.redrawHistory();
  }

  private initCanvasSize() {
    const canvasEl = this.canvasRef.nativeElement;
    const rect = canvasEl.parentElement!.getBoundingClientRect();
    canvasEl.width = rect.width;
    canvasEl.height = rect.height;
  }

  private getCoordinates(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const canvasEl = this.canvasRef.nativeElement;
    const rect = canvasEl.getBoundingClientRect();

    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else {
      const touch = event.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  }

  setColor(color: string) {
    if (!this.isDrawer) return;
    this.drawingService.currentColor = color;
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isDrawer) return;
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(event);
    this.drawingService.startStroke(x, y);
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDrawing || !this.isDrawer) return;
    const { x, y } = this.getCoordinates(event);
    this.drawingService.continueStroke(x, y);
  }

  onTouchStart(event: TouchEvent) {
    if (!this.isDrawer) return;
    event.preventDefault(); // Prevent scrolling
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(event);
    this.drawingService.startStroke(x, y);
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDrawer) return;
    event.preventDefault(); // Prevent scrolling
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(event);
    this.drawingService.continueStroke(x, y);
  }

  onMouseUp() {
    if (!this.isDrawing || !this.isDrawer) return;
    this.isDrawing = false;
    const stroke = this.drawingService.endStroke();

    if (stroke) {
      this.socketService.sendDrawBatch(this.roomId, stroke as any);
    }
  }

  clearCanvas() {
    if (!this.isDrawer) return;
    this.drawingService.clearCanvas();
    this.socketService.clearCanvas(this.roomId);
  }

  undo() {
    if (!this.isDrawer) return;
    this.drawingService.undo();
    this.socketService.undoAction(this.roomId, { action: 'undo' });
  }
}

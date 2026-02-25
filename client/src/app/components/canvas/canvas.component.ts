import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawingService, Stroke, ToolType } from '../../services/drawing.service';
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
  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() roomId: string = '';
  @Input() isDrawer: boolean = false;

  private isDrawing = false;
  private subs: Subscription[] = [];

  public activeLayer: 'foreground' | 'background' = 'foreground';

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
    const bgCtx = this.bgCanvasRef.nativeElement.getContext('2d');

    if (ctx && bgCtx) {
      this.drawingService.setContexts(ctx, bgCtx);
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
    const bgCanvasEl = this.bgCanvasRef.nativeElement;

    const rect = canvasEl.parentElement!.getBoundingClientRect();

    canvasEl.width = rect.width;
    canvasEl.height = rect.height;

    bgCanvasEl.width = rect.width;
    bgCanvasEl.height = rect.height;
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

  setLayer(layer: 'foreground' | 'background') {
    if (!this.isDrawer) return;
    this.activeLayer = layer;
    this.drawingService.setActiveLayer(layer);
  }

  setTool(tool: ToolType) {
    if (!this.isDrawer) return;
    this.drawingService.currentTool = tool;
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

    // For shapes, we need to constantly redraw the canvas to show the "preview" dragging
    if (this.drawingService.currentTool !== 'brush') {
      this.drawingService.redrawHistory();
      const preview = this.drawingService.getPreviewStroke();
      if (preview) this.drawingService.drawPreview(preview);
    }
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

    // Preview logic for touch
    if (this.drawingService.currentTool !== 'brush') {
      this.drawingService.redrawHistory();
      const preview = this.drawingService.getPreviewStroke();
      if (preview) this.drawingService.drawPreview(preview);
    }
  }

  onMouseUp() {
    if (!this.isDrawing || !this.isDrawer) return;
    this.isDrawing = false;

    // When finishing a shape, we draw it permanently
    if (this.drawingService.currentTool !== 'brush') {
      const preview = this.drawingService.getPreviewStroke();
      if (preview) {
        this.drawingService.drawStroke(preview); // Now it's officially stored history
      }
    }

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

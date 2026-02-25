import { Injectable } from '@angular/core';

export interface Point { x: number, y: number }
export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

@Injectable({
  providedIn: 'root'
})
export class DrawingService {
  private ctx!: CanvasRenderingContext2D;
  private currentStroke: Stroke | null = null;
  private history: Stroke[] = [];

  // configurable brush
  public currentColor = '#f8fafc';
  public currentWidth = 4;

  setContext(context: CanvasRenderingContext2D) {
    this.ctx = context;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  startStroke(x: number, y: number) {
    this.currentStroke = {
      points: [{ x, y }],
      color: this.currentColor,
      width: this.currentWidth
    };
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentWidth;
  }

  continueStroke(x: number, y: number) {
    if (!this.currentStroke) return;
    this.currentStroke.points.push({ x, y });
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  endStroke(): Stroke | null {
    if (!this.currentStroke) return null;
    this.history.push(this.currentStroke);
    const stroke = this.currentStroke;
    this.currentStroke = null;
    return stroke;
  }

  drawStroke(stroke: Stroke) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;

    if (stroke.points.length > 0) {
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      this.ctx.stroke();
    }
    // Also add to local history so we don't lose it on redraw
    this.history.push(stroke);
  }

  redrawHistory() {
    this.clearCanvas(false);
    this.history.forEach(stroke => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      if (stroke.points.length > 0) {
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        this.ctx.stroke();
      }
    });
  }

  clearCanvas(clearHistory: boolean = true) {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    if (clearHistory) {
      this.history = [];
    }
  }

  undo() {
    this.history.pop(); // remove last stroke
    this.redrawHistory();
  }
}

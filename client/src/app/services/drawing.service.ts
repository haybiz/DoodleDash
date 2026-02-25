import { Injectable } from '@angular/core';

export type ToolType = 'brush' | 'line' | 'rectangle' | 'circle' | 'highlighter' | 'spray';

export interface Point { x: number, y: number }

export interface Stroke {
  type: ToolType;
  layer: 'foreground' | 'background';
  points: Point[]; // For brush: all points. For shapes: [startPoint, endPoint]
  color: string;
  width: number;
}

@Injectable({
  providedIn: 'root'
})
export class DrawingService {
  private ctx!: CanvasRenderingContext2D; // Foreground
  private bgCtx!: CanvasRenderingContext2D; // Background

  private currentStroke: Stroke | null = null;
  private history: Stroke[] = [];

  // configurable brush
  public currentColor = '#f8fafc';
  public currentWidth = 4;
  public currentTool: ToolType = 'brush';
  public currentLayer: 'foreground' | 'background' = 'foreground';

  setContexts(fgContext: CanvasRenderingContext2D, bgContext: CanvasRenderingContext2D) {
    this.ctx = fgContext;
    this.bgCtx = bgContext;

    [this.ctx, this.bgCtx].forEach(c => {
      c.lineCap = 'round';
      c.lineJoin = 'round';
    });
  }

  setActiveLayer(layer: 'foreground' | 'background') {
    this.currentLayer = layer;
  }

  private getContextForLayer(layer: 'foreground' | 'background'): CanvasRenderingContext2D {
    return layer === 'foreground' ? this.ctx : this.bgCtx;
  }

  startStroke(x: number, y: number) {
    this.currentStroke = {
      type: this.currentTool,
      layer: this.currentLayer,
      points: [{ x, y }],
      color: this.currentColor,
      width: this.currentWidth
    };

    if (this.currentTool === 'brush' || this.currentTool === 'highlighter' || this.currentTool === 'spray') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.lineWidth = this.currentWidth;
    }
  }

  continueStroke(x: number, y: number) {
    if (!this.currentStroke) return;

    if (this.currentTool === 'brush' || this.currentTool === 'highlighter') {
      this.currentStroke.points.push({ x, y });
      const activeCtx = this.getContextForLayer(this.currentStroke.layer);

      // Real-time preview for brush/highlighter matching the drawStroke style
      if (this.currentTool === 'highlighter') {
        activeCtx.globalAlpha = 0.3;
        activeCtx.globalCompositeOperation = 'multiply';
      }
      activeCtx.lineTo(x, y);
      activeCtx.stroke();
      if (this.currentTool === 'highlighter') {
        activeCtx.globalAlpha = 1.0;
        activeCtx.globalCompositeOperation = 'source-over';
      }
    } else if (this.currentTool === 'spray') {
      this.currentStroke.points.push({ x, y });
      const activeCtx = this.getContextForLayer(this.currentStroke.layer);
      // Real-time preview for spray
      this.drawSprayParticles(activeCtx, x, y, this.currentWidth, this.currentColor);
    } else {
      // For shapes, we just record the current end point but don't commit to canvas yet
      // We rely on the CanvasComponent to clear and redraw history + this preview shape
      if (this.currentStroke.points.length > 1) {
        this.currentStroke.points[1] = { x, y };
      } else {
        this.currentStroke.points.push({ x, y });
      }
    }
  }

  endStroke(): Stroke | null {
    if (!this.currentStroke) return null;
    this.history.push(this.currentStroke);
    const stroke = this.currentStroke;
    this.currentStroke = null;
    return stroke;
  }

  getPreviewStroke(): Stroke | null {
    return this.currentStroke;
  }

  drawStroke(stroke: Stroke) {
    if (!this.ctx || !this.bgCtx || stroke.points.length === 0) return;

    const context = this.getContextForLayer(stroke.layer || 'foreground');

    context.beginPath();
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;

    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    if (stroke.type === 'brush' || stroke.type === 'highlighter') {
      if (stroke.type === 'highlighter') {
        context.globalAlpha = 0.3;
        context.globalCompositeOperation = 'multiply';
      }
      context.moveTo(start.x, start.y);
      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      context.stroke();
      if (stroke.type === 'highlighter') {
        context.globalAlpha = 1.0;
        context.globalCompositeOperation = 'source-over';
      }
    } else if (stroke.type === 'spray') {
      for (let i = 0; i < stroke.points.length; i++) {
        this.drawSprayParticles(context, stroke.points[i].x, stroke.points[i].y, stroke.width, stroke.color);
      }
    } else if (stroke.type === 'line' && stroke.points.length > 1) {
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    } else if (stroke.type === 'rectangle' && stroke.points.length > 1) {
      const width = end.x - start.x;
      const height = end.y - start.y;
      context.strokeRect(start.x, start.y, width, height);
    } else if (stroke.type === 'circle' && stroke.points.length > 1) {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      context.stroke();
    }

    // Also add to local history so we don't lose it on redraw
    this.history.push(stroke);
  }

  // Used by CanvasComponent to draw the preview without saving to history
  drawPreview(stroke: Stroke) {
    if (!this.ctx || !this.bgCtx || stroke.points.length < 2 || ['brush', 'highlighter', 'spray'].includes(stroke.type)) return;

    const context = this.getContextForLayer(stroke.layer || 'foreground');

    context.beginPath();
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;

    const start = stroke.points[0];
    const end = stroke.points[1];

    if (stroke.type === 'line') {
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    } else if (stroke.type === 'rectangle') {
      const width = end.x - start.x;
      const height = end.y - start.y;
      context.strokeRect(start.x, start.y, width, height);
    } else if (stroke.type === 'circle') {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      context.stroke();
    }
  }

  redrawHistory() {
    this.clearCanvas(false);
    const strokes = [...this.history];
    this.history = []; // Clear history temporarily so drawStroke doesn't duplicate them
    strokes.forEach(stroke => {
      this.drawStroke(stroke);
    });
  }

  clearCanvas(clearHistory: boolean = true) {
    if (!this.ctx || !this.bgCtx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.bgCtx.clearRect(0, 0, this.bgCtx.canvas.width, this.bgCtx.canvas.height);
    if (clearHistory) {
      this.history = [];
    }
  }

  undo() {
    this.history.pop(); // remove last stroke
    this.redrawHistory();
  }

  private drawSprayParticles(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    const density = radius * 2;
    ctx.fillStyle = color;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const sprayX = x + r * Math.cos(angle);
      const sprayY = y + r * Math.sin(angle);
      ctx.fillRect(sprayX, sprayY, 1, 1);
    }
  }
}

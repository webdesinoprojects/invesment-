"use client";

import { useEffect, useRef } from "react";

type GlobeProps = {
  className?: string;
};

type Point = { x: number; y: number; z: number };

export default function Earth({ className = "" }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let size = canvas.parentElement?.clientWidth ?? 620;
    let frame = 0;
    let rotation = 0.35;
    let pointerStart = 0;
    let pointerRotation = 0;

    const resize = () => {
      size = canvas.parentElement?.clientWidth ?? 620;
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = size * ratio;
      canvas.height = size * ratio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const project = (latitude: number, longitude: number): Point => {
      const lon = longitude + rotation + pointerRotation;
      const x = Math.cos(latitude) * Math.sin(lon);
      const rawY = Math.sin(latitude);
      const rawZ = Math.cos(latitude) * Math.cos(lon);
      const tilt = -0.18;
      return {
        x,
        y: rawY * Math.cos(tilt) - rawZ * Math.sin(tilt),
        z: rawY * Math.sin(tilt) + rawZ * Math.cos(tilt),
      };
    };

    const drawPath = (
      points: Point[],
      frontColor: string,
      backColor: string,
      width: number,
    ) => {
      const radius = size * 0.395;
      const center = size / 2;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]!;
        const current = points[index]!;
        context.beginPath();
        context.moveTo(center + previous.x * radius, center - previous.y * radius);
        context.lineTo(center + current.x * radius, center - current.y * radius);
        context.strokeStyle = (previous.z + current.z) / 2 > 0 ? frontColor : backColor;
        context.lineWidth = width;
        context.stroke();
      }
    };

    const render = () => {
      context.clearRect(0, 0, size, size);
      const center = size / 2;
      const radius = size * 0.395;

      const halo = context.createRadialGradient(center, center, radius * .72, center, center, radius * 1.12);
      halo.addColorStop(0, "rgba(3, 62, 31, .08)");
      halo.addColorStop(.76, "rgba(4, 92, 42, .13)");
      halo.addColorStop(.94, "rgba(16, 176, 76, .24)");
      halo.addColorStop(1, "rgba(16, 176, 76, 0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(center, center, radius * 1.14, 0, Math.PI * 2);
      context.fill();

      for (let degree = -80; degree <= 80; degree += 10) {
        const latitude = degree * Math.PI / 180;
        const points = Array.from({ length: 145 }, (_, index) =>
          project(latitude, (index / 144) * Math.PI * 2),
        );
        drawPath(points, "rgba(18, 157, 70, .46)", "rgba(5, 70, 36, .17)", .72);
      }

      for (let degree = 0; degree < 360; degree += 10) {
        const longitude = degree * Math.PI / 180;
        const points = Array.from({ length: 73 }, (_, index) =>
          project(-Math.PI / 2 + (index / 72) * Math.PI, longitude),
        );
        drawPath(points, "rgba(13, 145, 63, .42)", "rgba(4, 65, 31, .14)", .68);
      }

      for (let offset = 0; offset < 18; offset += 1) {
        const points = Array.from({ length: 181 }, (_, index) => {
          const progress = index / 180;
          const latitude = -Math.PI / 2 + progress * Math.PI;
          const longitude = progress * Math.PI * 2.35 + offset * Math.PI / 9;
          return project(latitude, longitude);
        });
        drawPath(points, "rgba(25, 165, 77, .32)", "rgba(4, 61, 30, .1)", .58);
      }

      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.strokeStyle = "rgba(19, 166, 74, .32)";
      context.lineWidth = 1.4;
      context.stroke();

      if (!pointerStart) rotation += .0015;
      frame = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    resize();
    frame = requestAnimationFrame(render);

    const start = (x: number) => {
      pointerStart = x;
      canvas.style.cursor = "grabbing";
    };
    const move = (x: number) => {
      if (pointerStart) pointerRotation = (x - pointerStart) / 190;
    };
    const end = () => {
      rotation += pointerRotation;
      pointerRotation = 0;
      pointerStart = 0;
      canvas.style.cursor = "grab";
    };
    const mouseDown = (event: MouseEvent) => start(event.clientX);
    const mouseMove = (event: MouseEvent) => move(event.clientX);
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches.item(0);
      if (touch) start(touch.clientX);
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches.item(0);
      if (touch) move(touch.clientX);
    };

    canvas.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", touchStart, { passive: true });
    canvas.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", end);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", end);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-label="Rotating green wireframe globe" />;
}

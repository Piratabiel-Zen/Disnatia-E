// Keep the legacy token size relative to the normal fitted map, including
// native fullscreen, CSS fallback and a map change while expanded.
export function fitMapWithReference(natural, frame, normalFrame = frame) {
  if (!natural?.w || !natural?.h || !frame?.w || !frame?.h) return { w:0, h:0, normalW:0 };
  const scale = Math.min(frame.w / natural.w, frame.h / natural.h);
  const reference = normalFrame || frame;
  const normalScale = Math.min(reference.w / natural.w, reference.h / natural.h);
  return { w:natural.w * scale, h:natural.h * scale, normalW:natural.w * normalScale };
}

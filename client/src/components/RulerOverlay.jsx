export default function RulerOverlay({
  width,
  height,
  stageScale,
  stageX,
  stageY,
  gridSize,
}) {
  const majorStep = gridSize * 5;
  const horizontalMarks = [];
  const verticalMarks = [];

  for (let x = 0; x < width; x += majorStep) {
    const worldX = Math.round((x - stageX) / stageScale);
    horizontalMarks.push({ screen: x, value: worldX });
  }

  for (let y = 0; y < height; y += majorStep) {
    const worldY = Math.round((y - stageY) / stageScale);
    verticalMarks.push({ screen: y, value: worldY });
  }

  return (
    <>
      <div className="ruler ruler-top">
        {horizontalMarks.map((mark, index) => (
          <div
            key={`hx-${index}`}
            className="ruler-mark vertical"
            style={{ left: mark.screen }}
          >
            <span>{mark.value}</span>
          </div>
        ))}
      </div>

      <div className="ruler ruler-left">
        {verticalMarks.map((mark, index) => (
          <div
            key={`vy-${index}`}
            className="ruler-mark horizontal"
            style={{ top: mark.screen }}
          >
            <span>{mark.value}</span>
          </div>
        ))}
      </div>

      <div className="ruler-corner" />
    </>
  );
}
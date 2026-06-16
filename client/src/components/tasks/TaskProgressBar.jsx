export default function TaskProgressBar({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.stav === 'splneno').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="progress-wrap card">
      <div className="progress-label">
        Splněno {done} z {total} úkolů ({percent}%)
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

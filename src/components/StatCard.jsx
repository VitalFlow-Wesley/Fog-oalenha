export default function StatCard({ title, value, detail, tone = 'default' }) {
  return (
    <div className={`statCard ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

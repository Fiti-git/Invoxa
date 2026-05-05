export default function TemplatesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Templates</h1>
      <div className="rounded-xl bg-white border p-6 opacity-70 text-sm">
        Template Studio is part of the next iteration. Currently the system
        uses a single multi-template extraction prompt that auto-classifies
        as <code>DELMEGE_DISTRIBUTOR</code>, <code>LINK_STOCKIST</code>, or
        <code>GENERIC</code>.
      </div>
    </div>
  );
}

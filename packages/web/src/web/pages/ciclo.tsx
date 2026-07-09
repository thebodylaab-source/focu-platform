import CycleGuide from "../components/nutrition/cycle-guide";

export default function CicloPage() {
  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>O Meu Ciclo 🌸</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
          Treina e alimenta-te ao ritmo do teu corpo, fase a fase.
        </p>
      </div>
      <CycleGuide />
    </div>
  );
}

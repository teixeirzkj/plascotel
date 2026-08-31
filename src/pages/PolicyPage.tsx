interface PolicyPageProps {
  title: string;
  paragraphs: string[];
}

export default function PolicyPage({ title, paragraphs }: PolicyPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:px-10">
      <h1 className="mb-6 font-display text-3xl">{title}</h1>
      <div className="flex flex-col gap-4 text-charcoal/70">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}

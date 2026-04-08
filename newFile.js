ranked.map((s, idx) => `
    <div class="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
        ...
        <span class="text-xl font-black text-white tabular-nums">${s.total.toFixed(1)}</span>
    </div>
`).join('');

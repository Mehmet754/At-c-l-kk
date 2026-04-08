       // --- AYARLAR ---
        // Buraya Google AI Studio'dan aldığın anahtarı yapıştır
        const API_KEY = ""; 

        // --- DURUM YÖNETİMİ ---
        let sessions = [];
        let currentImageBase64 = null;

        // --- ELEMENTLER ---
        const shooterInput = document.getElementById('shooterName');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const previewArea = document.getElementById('previewArea');
        const previewImg = document.getElementById('previewImg');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const previewActions = document.getElementById('previewActions');
        const historyList = document.getElementById('historyList');
        const leaderboard = document.getElementById('leaderboard');
        const emptyState = document.getElementById('emptyState');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        // --- FONKSİYONLAR ---

        // İkonları başlat
        function initIcons() {
            lucide.createIcons();
        }

        // Hata Göster
        function showError(msg) {
            errorText.innerText = msg;
            errorMessage.classList.remove('hidden');
            setTimeout(() => errorMessage.classList.add('hidden'), 8000);
        }

        // Fotoğraf Seçme
        uploadBtn.addEventListener('click', () => {
            if(!shooterInput.value.trim()) {
                showError("Lütfen önce sporcu adını girin.");
                return;
            }
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showError("Dosya boyutu çok büyük (Max 5MB).");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentImageBase64 = event.target.result;
                    previewImg.src = currentImageBase64;
                    previewArea.classList.remove('hidden');
                    previewArea.scrollIntoView({ behavior: 'smooth' });
                };
                reader.readAsDataURL(file);
            }
        });

        // İptal Et
        document.getElementById('cancelBtn').addEventListener('click', () => {
            previewArea.classList.add('hidden');
            currentImageBase64 = null;
            fileInput.value = "";
        });

        // Analiz İsteği
        document.getElementById('analyzeBtn').addEventListener('click', async () => {
            if (!currentImageBase64 || !API_KEY) {
                showError(API_KEY ? "Görsel bulunamadı." : "Lütfen kod içerisindeki API_KEY alanını doldurun.");
                return;
            }

            loadingOverlay.classList.remove('hidden');
            previewActions.classList.add('invisible');

            try {
                const prompt = "Analiz görevi: Atış hedefi kağıdındaki mermi deliklerini bul. Her birine 0.0-10.9 arası puan ver. Sadece JSON dön: {\"shots\": [puanlar], \"total\": toplam}";
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inlineData: { mimeType: "image/png", data: currentImageBase64.split(',')[1] } }
                            ]
                        }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error.message);

                const resultText = data.candidates[0].content.parts[0].text;
                const analysis = JSON.parse(resultText);

                const newSession = {
                    id: Date.now(),
                    name: shooterInput.value.trim(),
                    shots: analysis.shots || [],
                    total: analysis.total || 0,
                    date: new Date().toLocaleString('tr-TR'),
                    image: currentImageBase64
                };

                sessions.push(newSession);
                updateUI();
                previewArea.classList.add('hidden');
            } catch (err) {
                console.error(err);
                showError("Analiz sırasında hata: " + err.message);
            } finally {
                loadingOverlay.classList.add('hidden');
                previewActions.classList.remove('invisible');
                currentImageBase64 = null;
                fileInput.value = "";
            }
        });

        function updateUI() {
            // Geçmiş Listesi
            if (sessions.length > 0) {
                emptyState.classList.add('hidden');
                historyList.innerHTML = sessions.slice().reverse().map(s => `
                    <div class="bg-zinc-900 border border-zinc-800 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center gap-6 group hover:border-red-500/40 transition-all">
                        <div class="w-24 h-24 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                            <img src="${s.image}" class="w-full h-full object-cover" />
                        </div>
                        <div class="flex-1 min-w-0 text-center sm:text-left">
                            <h3 class="font-black text-lg text-white mb-1">${s.name}</h3>
                            <p class="text-[10px] text-zinc-600 font-mono mb-4">${s.date}</p>
                            <div class="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                                ${s.shots.map(val => `<span class="bg-zinc-950 px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-400 border border-white/5">${val.toFixed(1)}</span>`).join('')}
                            </div>
                        </div>
                        <div class="flex items-center gap-6 px-8 sm:border-l border-zinc-800">
                            <div class="text-center">
                                <p class="text-[9px] font-black text-zinc-600 uppercase">Skor</p>
                                <p class="text-3xl font-black text-white">${s.total.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // Liderlik Tablosu
            const ranked = [...sessions].sort((a, b) => b.total - a.total);
            if (ranked.length > 0) {
                document.getElementById('lbEmpty').classList.add('hidden');
                leaderboard.innerHTML = ranked.map((s, idx) => `
                    <div class="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                        <div class="flex items-center gap-4">
                            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}">
                                ${idx + 1}
                            </div>
                            <p class="text-sm font-black text-white truncate w-24 tracking-tight">${s.name}</p>
                        </div>
                        <span class="text-xl font-black text-white tabular-nums">${s.total.toFixed(1)}</span>
                    </div>
                `).join('');
            }
            initIcons();
        }

        // Başlangıç
        window.onload = initIcons;
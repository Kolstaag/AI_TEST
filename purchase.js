(function () {
  const grid = document.querySelector('#product-grid');
  if (!grid) return;

  /**
   * Images are from /assets (copied for convenience)
   * You can replace these with your real product images later.
   */
  const DRONES = [
    {
      id: 'aeropro',
      name: 'AeroPro 4K',
      tagline: 'All‑around aerial photography kit',
      badge: 'Best seller',
      variants: [
        {
          id: 'standard',
          label: 'Standard Kit',
          price: 899,
          image: 'assets/drone4.jpg',
          description:
            'Great for creators: stabilized 4K camera, GPS hold, and beginner-friendly flight modes. Includes 1 battery and basic carry case.',
          bullets: ['4K stabilized camera', 'GPS return-to-home', '1 battery included'],
        },
        {
          id: 'combo',
          label: 'Fly More Combo',
          price: 1099,
          image: 'assets/drone2.webp',
          description:
            'More air time, less downtime. Adds extra batteries, multi‑charger, spare props, and a compact travel bag.',
          bullets: ['3 batteries total', 'Multi-charger', 'Travel bag + spares'],
        },
        {
          id: 'pro',
          label: 'Creator Pro',
          price: 1299,
          image: 'assets/drone1.jpg',
          description:
            'For serious shooting: adds ND filters, premium controller grips, and a fast microSD card for high-bitrate footage.',
          bullets: ['ND filter set', 'Premium controls', 'High-speed storage'],
        },
      ],
    },
    {
      id: 'skylite',
      name: 'SkyLite Mini',
      tagline: 'Compact, quiet, and easy to learn',
      badge: 'Beginner',
      variants: [
        {
          id: 'starter',
          label: 'Starter',
          price: 349,
          image: 'assets/drone2.webp',
          description:
            'Lightweight starter drone with assisted takeoff/landing and an intuitive controller. Perfect for first flights and travel.',
          bullets: ['Beginner modes', 'Compact design', 'USB charging'],
        },
        {
          id: 'bundle',
          label: 'Starter + Spares',
          price: 399,
          image: 'assets/drone3.jpg',
          description:
            'Includes spare props, extra battery, and a soft case—ideal if you’re learning and want quick replacements on hand.',
          bullets: ['2 batteries total', 'Spare props', 'Soft travel case'],
        },
      ],
    },
    {
      id: 'stormracer',
      name: 'StormRacer FPV',
      tagline: 'High‑speed FPV performance',
      badge: 'FPV',
      variants: [
        {
          id: 'ready',
          label: 'Ready‑to‑Fly',
          price: 599,
          image: 'assets/drone3.jpg',
          description:
            'A tuned FPV quad for fast laps and sharp handling. Includes receiver and preconfigured flight controller settings.',
          bullets: ['Agile FPV frame', 'Tuned flight controller', 'Racing-ready'],
        },
        {
          id: 'race',
          label: 'Race Kit',
          price: 699,
          image: 'assets/parts.jpg',
          description:
            'Adds spare arms, props, and a field tool kit—built for race day repairs and quick swaps between heats.',
          bullets: ['Spare arms + props', 'Field tool kit', 'Extra hardware'],
        },
        {
          id: 'cinewhoop',
          label: 'Cinewhoop Add‑On',
          price: 749,
          image: 'assets/repair.webp',
          description:
            'Includes prop guards and soft mounts for smoother indoor/close‑proximity footage while keeping FPV agility.',
          bullets: ['Prop guards', 'Soft vibration mounts', 'Indoor-friendly'],
        },
      ],
    },
  ];

  function money(n) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderCard(drone) {
    const defaultVariant = drone.variants[0];

    const options = drone.variants
      .map(
        (v) =>
          `<option value="${escapeHTML(v.id)}">${escapeHTML(v.label)}</option>`
      )
      .join('');

    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.droneId = drone.id;

    card.innerHTML = `
      <div class="product-top">
        <div>
          <div class="product-kicker">
            <span class="pill">${escapeHTML(drone.badge)}</span>
            <span class="kicker-text">${escapeHTML(drone.tagline)}</span>
          </div>
          <h3 class="product-title">${escapeHTML(drone.name)}</h3>
        </div>

        <div class="product-price" data-role="price">${money(defaultVariant.price)}</div>
      </div>

      <div class="product-media">
        <img data-role="image" src="${escapeHTML(defaultVariant.image)}" alt="${escapeHTML(drone.name)}" loading="lazy" width="1200" height="800" />
      </div>

      <div class="product-body">
        <label class="field">
          <span class="field-label">Configuration</span>
          <select class="select" data-role="select" aria-label="Choose configuration for ${escapeHTML(drone.name)}">
            ${options}
          </select>
        </label>

        <p class="product-desc" data-role="desc">${escapeHTML(defaultVariant.description)}</p>

        <ul class="product-bullets" data-role="bullets">
          ${defaultVariant.bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join('')}
        </ul>

        <div class="product-actions">
          <a class="btn primary" href="contact.html">Buy / Request invoice</a>
          <a class="btn ghost" href="contact.html">Ask a question</a>
        </div>

        <p class="product-fineprint">Shown pricing is estimate. Taxes/shipping calculated at checkout or on invoice.</p>
      </div>
    `;

    const select = card.querySelector('[data-role="select"]');
    const img = card.querySelector('[data-role="image"]');
    const price = card.querySelector('[data-role="price"]');
    const desc = card.querySelector('[data-role="desc"]');
    const bullets = card.querySelector('[data-role="bullets"]');

    select.addEventListener('change', () => {
      const v = drone.variants.find((x) => x.id === select.value) || defaultVariant;

      // Smooth content swap
      card.classList.add('is-swapping');
      window.setTimeout(() => {
        img.src = v.image;
        img.alt = `${drone.name} — ${v.label}`;
        price.textContent = money(v.price);
        desc.textContent = v.description;
        bullets.innerHTML = v.bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join('');
        card.classList.remove('is-swapping');
      }, 120);
    });

    return card;
  }

  function applyAutoSelect() {
    const params = new URLSearchParams(window.location.search);
    const requestedDrone = params.get('drone');
    const requestedVariant = params.get('variant');
    if (!requestedDrone) return;

    const card = grid.querySelector(`[data-drone-id="${requestedDrone}"]`);
    if (!card) return;

    const select = card.querySelector('[data-role="select"]');
    if (select && requestedVariant) {
      const hasVariant = Array.from(select.options).some((opt) => opt.value === requestedVariant);
      if (hasVariant) {
        select.value = requestedVariant;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    card.classList.add('is-selected');
    setTimeout(() => card.classList.remove('is-selected'), 2200);

    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Render
  const fragment = document.createDocumentFragment();
  for (const drone of DRONES) fragment.appendChild(renderCard(drone));
  grid.appendChild(fragment);
  applyAutoSelect();
})();

/* Shared ransom-note text renderer — used by hunt.js, happy-hunting.js, create-hunt.js */

function renderRansomText(text) {
    const fonts = [
        'Georgia,serif', '"Arial Black",sans-serif', '"Courier New",monospace',
        '"Times New Roman",serif', 'Impact,sans-serif', '"Special Elite",cursive',
        '"Playfair Display",serif', 'Verdana,sans-serif'
    ];
    const bgs = [
        '#ffffff', '#fff8dc', '#ffe4e1', '#e8f4f8', '#f0ffe0',
        '#fff0f5', '#f5f5dc', '#e6e6fa', '#fdf5e6', '#f0f8ff'
    ];
    const rots = [-3, -2.5, -1.5, -1, 0, 0, 0, 1, 1.5, 2.5, 3];
    const sizes = ['0.82em', '0.88em', '0.92em', '1em', '1em', '1.05em', '1.1em'];
    const pick = a => a[Math.floor(Math.random() * a.length)];

    return text.split(/\s+/).map(word => {
        const bold = Math.random() > 0.75 ? 'font-weight:700;' : '';
        return `<span class="ransom-word" style="font-family:${pick(fonts)};background:${pick(bgs)};transform:rotate(${pick(rots)}deg);font-size:${pick(sizes)};${bold}">${word}</span>`;
    }).join('');
}

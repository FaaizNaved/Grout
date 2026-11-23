// Artisanal Letterpress Diploma Generator using HTML5 Canvas for GROUT!

export class CertificateGenerator {
  static generateCertificate(canvas, playerName = "Senior Babu Mistri") {
    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 800;

    canvas.width = width;
    canvas.height = height;

    // Background - Warm hand-milled rag paper texture
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FAF7F0');
    bgGrad.addColorStop(0.5, '#F5F1E8');
    bgGrad.addColorStop(1, '#EFEAE0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Architectural Double Border (Letterpress rules)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#78716C';
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#A8A29E';
    ctx.strokeRect(44, 44, width - 88, height - 88);

    // Decorative corner crosses
    const cornerOffsets = [
      [40, 40], [width - 40, 40], [40, height - 40], [width - 40, height - 40]
    ];
    cornerOffsets.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#78716C';
      ctx.fill();
    });

    // Top Authority Emblem
    ctx.fillStyle = '#78716C';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('ALL INDIA COUNCIL OF JUGAAD & MASONRY RESTORATION', width / 2, 105);

    ctx.fillStyle = '#A8A29E';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText('Established 1984 • Registration No. JGD-420/GROUT', width / 2, 132);

    // Divider Line
    ctx.strokeStyle = '#D6CEBF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 180, 155);
    ctx.lineTo(width / 2 + 180, 155);
    ctx.stroke();

    // Diploma Title
    ctx.fillStyle = '#1C1917';
    ctx.font = '700 48px "Fraunces", Georgia, serif';
    ctx.fillText('DOCTOR OF GROUTOLOGY', width / 2, 225);

    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#9A3412';
    ctx.fillText('HONORIS CAUSA ( D . G R O U T )', width / 2, 265);

    // Subtext
    ctx.fillStyle = '#57534E';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('Be it known that by unanimous decree, the Council hereby confers upon', width / 2, 320);

    // Recipient Name (Hand-lettered style)
    ctx.font = '700 52px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#1C1917';
    ctx.fillText(playerName, width / 2, 390);

    // Underline for name
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#9A3412';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 240, 410);
    ctx.lineTo(width / 2 + 240, 410);
    ctx.stroke();

    // Achievement Description
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = '#44403C';
    ctx.fillText('this distinguished certificate for unyielding confidence in resolving catastrophic architectural,', width / 2, 460);
    ctx.fillText('emotional, and existential crises across bathroom floors, shattered hearts, and sinking ships', width / 2, 492);
    
    // Iconic Punchline
    ctx.font = 'bold 22px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#9A3412';
    ctx.fillText('BY PRONOUNCING THE SACRED WORDS: "ISME GROUT BHAR DENGE"', width / 2, 545);

    // Hand-pressed Terracotta Wax Seal
    const sealX = width / 2;
    const sealY = 660;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(sealX, sealY, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#9A3412'; // Rich Terracotta Seal
    ctx.shadowColor = 'rgba(28, 25, 23, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fill();

    // Seal inner ring
    ctx.strokeStyle = '#F7F4EE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 46, 0, Math.PI * 2);
    ctx.stroke();

    // Seal text
    ctx.fillStyle = '#F7F4EE';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL SEAL', sealX, sealY - 14);
    ctx.font = 'bold 15px "Fraunces", serif';
    ctx.fillText('MISTRI OP', sealX, sealY + 5);
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('APPROVED JUGAAD', sealX, sealY + 20);
    ctx.restore();

    // Signatures
    // Left Sign
    ctx.font = 'italic 24px Georgia, cursive, serif';
    ctx.fillStyle = '#1C1917';
    ctx.textAlign = 'center';
    ctx.fillText('R. K. Thekedar', 240, 680);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#A8A29E';
    ctx.beginPath();
    ctx.moveTo(140, 695);
    ctx.lineTo(340, 695);
    ctx.stroke();
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#78716C';
    ctx.fillText('Chief Site Inspector', 240, 718);

    // Right Sign
    ctx.font = 'italic 24px Georgia, cursive, serif';
    ctx.fillStyle = '#1C1917';
    ctx.fillText('Babu Mistri', width - 240, 680);
    ctx.beginPath();
    ctx.moveTo(width - 340, 695);
    ctx.lineTo(width - 140, 695);
    ctx.stroke();
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#78716C';
    ctx.fillText('Chief Grout Officer (CGO)', width - 240, 718);

    return canvas;
  }

  static download(canvas, filename = 'Doctor-of-Groutology.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

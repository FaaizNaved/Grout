// Certificate of Grout Mastery Diploma Generator using HTML5 Canvas

export class CertificateGenerator {
  static generateCertificate(canvas, playerName = "Certified Grout Master") {
    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 800;

    canvas.width = width;
    canvas.height = height;

    // Background - Vintage parchment diploma texture
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#fdfbf7');
    bgGrad.addColorStop(0.5, '#fef9ec');
    bgGrad.addColorStop(1, '#fbf5e6');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ornate Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#b45309'; // Rich Amber/Bronze
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(46, 46, width - 92, height - 92);

    // Corner flourishes
    const corners = [
      [55, 55], [width - 55, 55], [55, height - 55], [width - 55, height - 55]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#b45309';
      ctx.fill();
    });

    // Top Authority Emblem
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALL INDIA COUNCIL OF JUGAAD & MISTRI FEDERATION', width / 2, 110);

    ctx.fillStyle = '#b45309';
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText('Regd. Under Section 420 of Thekedar & Grout Works Act, 2026', width / 2, 140);

    // Diploma Title
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 54px "Times New Roman", Georgia, serif';
    ctx.fillText('DOCTOR OF GROUTOLOGY', width / 2, 220);

    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillStyle = '#d97706';
    ctx.fillText('( D .  G R O U T )', width / 2, 260);

    // Subtext
    ctx.fillStyle = '#451a03';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('This honorable parchment certifies that', width / 2, 315);

    // Recipient Name
    ctx.font = 'bold 52px "Brush Script MT", "Times New Roman", cursive, serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(playerName, width / 2, 385);

    // Underline for name
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, 405);
    ctx.lineTo(width / 2 + 250, 405);
    ctx.stroke();

    // Achievement Description
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('has proven exceptional bravery, supreme disregard for structural mathematics,', width / 2, 455);
    ctx.fillText('and solved crooked stairs, shattered hearts, zero exam scores, and crumbling towers', width / 2, 488);
    
    // Iconic Punchline
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = '#b45309';
    ctx.fillText('BY DECLARING: "ISME GROUT BHAR DENGE!"', width / 2, 535);

    // Gold Medal Seal
    const sealX = width / 2;
    const sealY = 660;
    const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, 65);
    sealGrad.addColorStop(0, '#fde68a');
    sealGrad.addColorStop(0.7, '#f59e0b');
    sealGrad.addColorStop(1, '#b45309');

    ctx.save();
    ctx.beginPath();
    ctx.arc(sealX, sealY, 65, 0, Math.PI * 2);
    ctx.fillStyle = sealGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Seal text
    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ 100% CERTIFIED ★', sealX, sealY - 18);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('MISTRI OP', sealX, sealY + 6);
    ctx.font = '10px sans-serif';
    ctx.fillText('APPROVED JUGAAD', sealX, sealY + 24);
    ctx.restore();

    // Signatures
    // Left Sign
    ctx.font = 'italic bold 24px "Brush Script MT", cursive, serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('Ramesh Thekedar', 240, 680);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(140, 695);
    ctx.lineTo(340, 695);
    ctx.stroke();
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Senior Angry Thekedar', 240, 720);

    // Right Sign
    ctx.font = 'italic bold 24px "Brush Script MT", cursive, serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Babu Mistri', width - 240, 680);
    ctx.beginPath();
    ctx.moveTo(width - 340, 695);
    ctx.lineTo(width - 140, 695);
    ctx.stroke();
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Chief Grout Officer (CGO)', width - 240, 720);

    return canvas;
  }

  static download(canvas, filename = 'Grout-Master-Diploma.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

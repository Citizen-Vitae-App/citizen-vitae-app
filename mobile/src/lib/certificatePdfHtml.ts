import type { CertificateData } from '@/types/certificate';
import { COCARDE_SVG, COURONE_SVG, LOGO_CZV_SVG } from '@/lib/certificatePdfSvgs.generated';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * HTML pour `expo-print` : même structure que l’écran + logos SVG (data URI).
 */
export function buildCertificatePdfHtml(data: CertificateData): string {
  const orgLogo =
    data.organizationLogoUrl != null
      ? `<img class="org" src="${escapeHtml(data.organizationLogoUrl)}" alt="" />`
      : `<div class="org-fallback">${escapeHtml(data.organizationName.charAt(0))}</div>`;

  const roleBlock =
    data.validatorRole != null && data.validatorRole.length > 0
      ? `<div class="val-role">${escapeHtml(data.validatorRole)}</div>`
      : '';

  const courUri = svgDataUri(COURONE_SVG);
  const cocUri = svgDataUri(COCARDE_SVG);
  const logoUri = svgDataUri(LOGO_CZV_SVG);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@700&family=Inter:wght@400;600&family=Questrial&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #fafafa;
      font-family: Questrial, system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .frame {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
      aspect-ratio: 16 / 9;
      position: relative;
      background: #fff;
      border: 3px solid #3c2c00;
      overflow: hidden;
    }
    .inner {
      position: absolute;
      top: 7px; left: 7px; right: 7px; bottom: 7px;
      border: 2px solid #D79806;
      border-radius: 3px;
      pointer-events: none;
      z-index: 10;
    }
    .footer-bg {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 24.5%;
      background: #FAF7EF;
      z-index: 1;
    }
    .courone-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 51%;
      z-index: 2;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .courone-img {
      width: 100%;
      height: auto;
      max-height: 94%;
      display: block;
    }
    .cocarde-wrap {
      position: absolute;
      top: 34%;
      right: 10%;
      width: 10%;
      z-index: 5;
    }
    .cocarde-img {
      width: 100%;
      height: auto;
      display: block;
    }
    .logo-top {
      position: absolute;
      top: 6.8%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .logo-img {
      height: clamp(14px, 3.5vw, 30px);
      width: auto;
      display: block;
    }
    .title {
      position: absolute;
      top: 17%;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      text-align: center;
      color: #012573;
      font-size: clamp(11px, 2.8vw, 24px);
      font-weight: 500;
      z-index: 20;
      text-shadow: 0.5px 0 0 #000, -0.5px 0 0 #000;
    }
    .attrib {
      position: absolute;
      top: 28%;
      left: 50%;
      transform: translateX(-50%);
      color: #012573;
      font-size: clamp(7px, 1.7vw, 15px);
      font-weight: 500;
      z-index: 20;
    }
    .name {
      position: absolute;
      top: 34%;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      text-align: center;
      color: #012573;
      font-family: 'EB Garamond', Georgia, serif;
      font-size: clamp(12px, 3.4vw, 28px);
      font-weight: 700;
      z-index: 20;
    }
    .line {
      position: absolute;
      top: 46%;
      left: 50%;
      transform: translateX(-50%);
      width: 48%;
      height: 1px;
      background: #D79806;
      z-index: 20;
    }
    .body {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%);
      width: 78%;
      text-align: center;
      color: #012573;
      font-size: clamp(5px, 1.15vw, 10px);
      font-weight: 500;
      line-height: 1.5;
      z-index: 20;
    }
    .col-date {
      position: absolute;
      top: 77.2%;
      left: 14.6%;
      z-index: 20;
      color: #012573;
      font-size: clamp(6px, 1.35vw, 12px);
    }
    .col-val {
      position: absolute;
      top: 77.2%;
      right: 10.7%;
      z-index: 20;
      color: #012573;
      text-align: left;
      font-size: clamp(6px, 1.35vw, 12px);
    }
    .org-wrap {
      position: absolute;
      top: 70%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: clamp(35px, 10vw, 70px);
      height: clamp(35px, 10vw, 70px);
      z-index: 20;
    }
    .org {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #e5e7eb;
    }
    .org-fallback {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #012573;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: clamp(10px, 2vw, 18px);
    }
    .val-name {
      font-family: Inter, system-ui, sans-serif;
      font-weight: 600;
      margin-top: 4px;
    }
    .val-role {
      font-family: Inter, system-ui, sans-serif;
      font-weight: 600;
      font-size: clamp(5px, 1.2vw, 11px);
      margin-top: 2px;
    }
    .watermark {
      position: absolute;
      top: 92.6%;
      left: 50%;
      transform: translateX(-50%);
      color: #1c56d3;
      font-family: Inter, system-ui, sans-serif;
      font-size: clamp(4px, 0.9vw, 8px);
      white-space: nowrap;
      z-index: 20;
    }
    .wm-strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="inner"></div>
    <div class="footer-bg"></div>
    <div class="courone-wrap">
      <img class="courone-img" src="${courUri}" alt="" />
    </div>
    <div class="cocarde-wrap">
      <img class="cocarde-img" src="${cocUri}" alt="" />
    </div>
    <div class="logo-top">
      <img class="logo-img" src="${logoUri}" alt="Citizen Vitae" />
    </div>
    <div class="title">Certificat d'action citoyenne</div>
    <div class="attrib">Attribué à</div>
    <div class="name">${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</div>
    <div class="line"></div>
    <div class="body">
      Né(e) le ${escapeHtml(data.dateOfBirth)}, en reconnaissance de sa participation à l'évènement<br/>
      « ${escapeHtml(data.eventName)} » organisé par ${escapeHtml(data.organizationName)} le ${escapeHtml(data.eventDate)} de<br/>
      ${escapeHtml(data.eventStartTime)} à ${escapeHtml(data.eventEndTime)} au ${escapeHtml(data.eventLocation)}.
    </div>
    <div class="col-date">
      <div>Date</div>
      <div style="margin-top:4px">${escapeHtml(data.eventDate)}</div>
    </div>
    <div class="org-wrap">${orgLogo}</div>
    <div class="col-val">
      <div>Signataire</div>
      <div class="val-name">${escapeHtml(data.validatorName)}</div>
      ${roleBlock}
    </div>
    <p class="watermark"><span class="wm-strong">Sécurisé par Citizen Vitae</span>, l'authenticité de l'engagement, vérifiée</p>
  </div>
</body>
</html>`;
}

import { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import type { CertificateData } from '@/types/certificate';

import Courone from '../../../assets/certificate/courone.svg';
import Cocarde from '../../../assets/certificate/cocarde.svg';
import LogoCzv from '../../../assets/certificate/logo-czv.svg';

const GOLD_OUTER = '#3c2c00';
const GOLD_INNER = '#D79806';
const BLUE = '#012573';
const FOOTER_BG = '#FAF7EF';
const WATERMARK = '#1c56d3';

/** Aligné sur `CertificatePreview` (web), branche mobile. Cadre fixe 16:9, pleine largeur. */
export function CertificatePreviewNative({ data }: { data: CertificateData }) {
  const [cardW, setCardW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setCardW(w);
  };

  const w = cardW;
  const scale = (min: number, vw: number, max: number) => Math.max(min, Math.min(max, w * vw));

  const cardH = w > 0 ? (w * 9) / 16 : 0;
  const courWBase = w > 0 ? w * 0.51 : 0;
  const naturalCourH = courWBase * (472 / 456);
  const maxCourH = cardH * 0.94;
  let courW = courWBase;
  let courH = naturalCourH;
  if (w > 0 && naturalCourH > maxCourH) {
    courH = maxCourH;
    courW = maxCourH * (456 / 472);
  }
  const cocW = w > 0 ? w * 0.1 : 0;
  const cocH = cocW * (118 / 75);
  const logoH = w > 0 ? scale(14, 0.035, 30) : 20;
  const logoW = logoH * (308 / 49);
  const orgSize = w > 0 ? scale(35, 0.1, 70) : 56;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={styles.innerGold} pointerEvents="none" />
      <View style={styles.footerBg} pointerEvents="none" />

      {w > 0 && courW > 0 ? (
        <View style={styles.couroneWrap} pointerEvents="none">
          <Courone width={courW} height={courH} />
        </View>
      ) : null}

      {w > 0 && cocW > 0 ? (
        <View style={[styles.cocardeWrap, { width: cocW, height: cocH }]} pointerEvents="none">
          <Cocarde width={cocW} height={cocH} />
        </View>
      ) : null}

      {w > 0 ? (
        <View style={styles.logoWrap} pointerEvents="none">
          <LogoCzv width={logoW} height={logoH} />
        </View>
      ) : null}

      <Text style={[styles.title, { fontSize: scale(11, 0.028, 24) }]}>Certificat d&apos;action citoyenne</Text>
      <Text style={[styles.attrib, { fontSize: scale(7, 0.017, 15) }]}>Attribué à</Text>
      <Text style={[styles.name, { fontSize: scale(12, 0.034, 28) }]}>
        {data.firstName} {data.lastName}
      </Text>

      <View style={styles.goldLine} />

      <Text
        style={[
          styles.body,
          {
            fontSize: scale(5, 0.0115, 10),
            lineHeight: Math.round(scale(5, 0.0115, 10) * 1.45),
          },
        ]}
      >
        {`Né(e) le ${data.dateOfBirth}, en reconnaissance de sa participation à l'évènement\n`}
        {`"${data.eventName}" organisé par ${data.organizationName} le ${data.eventDate} de\n`}
        {`${data.eventStartTime} à ${data.eventEndTime} au ${data.eventLocation}.`}
      </Text>

      <View style={styles.dateCol}>
        <Text style={[styles.footerLbl, { fontSize: scale(6, 0.0135, 12) }]}>Date</Text>
        <Text style={[styles.footerVal, { fontSize: scale(6, 0.0135, 12), marginTop: 4 }]}>{data.eventDate}</Text>
      </View>

      <View
        style={[
          styles.orgWrap,
          { width: orgSize, height: orgSize, marginLeft: -orgSize / 2, marginTop: -orgSize / 2 },
        ]}
      >
        {data.organizationLogoUrl ? (
          <Image
            source={{ uri: data.organizationLogoUrl }}
            style={styles.orgImg}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.orgPlaceholder}>
            <Text style={[styles.orgLetter, { fontSize: scale(10, 0.02, 18) }]}>
              {data.organizationName.charAt(0)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.validatorCol}>
        <Text style={[styles.footerLbl, { fontSize: scale(6, 0.0135, 12) }]}>Signataire</Text>
        <Text style={[styles.valName, { fontSize: scale(6, 0.0135, 12), marginTop: 4 }]}>{data.validatorName}</Text>
        {data.validatorRole ? (
          <Text style={[styles.valRole, { fontSize: scale(5, 0.012, 11), marginTop: 2 }]}>{data.validatorRole}</Text>
        ) : null}
      </View>

      <Text style={[styles.watermark, { fontSize: scale(4, 0.009, 8) }]}>
        <Text style={styles.wmBold}>Sécurisé par Citizen Vitae</Text>
        <Text style={styles.wmRest}>, l&apos;authenticité de l&apos;engagement, vérifiée</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GOLD_OUTER,
    borderStyle: 'solid',
    overflow: 'hidden',
  },
  innerGold: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
    borderColor: GOLD_INNER,
    borderRadius: 3,
    zIndex: 10,
  },
  footerBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24.5%',
    backgroundColor: FOOTER_BG,
    zIndex: 1,
  },
  couroneWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cocardeWrap: {
    position: 'absolute',
    top: '34%',
    right: '10%',
    zIndex: 20,
  },
  logoWrap: {
    position: 'absolute',
    top: '6.8%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  title: {
    position: 'absolute',
    top: '17%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: BLUE,
    fontFamily: 'Questrial_400Regular',
    fontWeight: '500',
    zIndex: 20,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0.5, height: 0 },
    textShadowRadius: 0,
  },
  attrib: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: BLUE,
    fontFamily: 'Questrial_400Regular',
    fontWeight: '500',
    zIndex: 20,
  },
  name: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: BLUE,
    fontFamily: 'EBGaramond_700Bold',
    fontWeight: '700',
    zIndex: 20,
  },
  goldLine: {
    position: 'absolute',
    top: '46%',
    left: '26%',
    right: '26%',
    height: 1,
    backgroundColor: GOLD_INNER,
    zIndex: 20,
  },
  body: {
    position: 'absolute',
    top: '50%',
    left: '11%',
    right: '11%',
    textAlign: 'center',
    color: BLUE,
    fontFamily: 'Questrial_400Regular',
    fontWeight: '500',
    zIndex: 20,
  },
  dateCol: {
    position: 'absolute',
    top: '77.2%',
    left: '14.6%',
    zIndex: 20,
    alignItems: 'flex-start',
  },
  footerLbl: {
    color: BLUE,
    fontFamily: 'Questrial_400Regular',
    fontWeight: '500',
  },
  footerVal: {
    color: BLUE,
    fontFamily: 'Questrial_400Regular',
    fontWeight: '500',
  },
  orgWrap: {
    position: 'absolute',
    top: '70%',
    left: '50%',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgImg: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orgPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgLetter: { color: '#FFFFFF', fontWeight: '800' },
  validatorCol: {
    position: 'absolute',
    top: '77.2%',
    right: '10.7%',
    zIndex: 20,
    alignItems: 'flex-start',
  },
  valName: {
    color: BLUE,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  valRole: {
    color: BLUE,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  watermark: {
    position: 'absolute',
    top: '92.6%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WATERMARK,
    fontFamily: 'Inter_400Regular',
    zIndex: 20,
  },
  wmBold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  wmRest: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
});

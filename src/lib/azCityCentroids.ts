// Approximate centroid coordinates for major Azerbaijan cities/regions.
// Used as a fallback when a listing has no precise lat/lng.
export const AZ_CITY_CENTROIDS: Record<string, [number, number]> = {
  "Bakı": [40.4093, 49.8671],
  "Baku": [40.4093, 49.8671],
  "Sumqayıt": [40.5897, 49.6686],
  "Gəncə": [40.6828, 46.3606],
  "Mingəçevir": [40.7703, 47.0496],
  "Şirvan": [39.9311, 48.9206],
  "Naxçıvan": [39.2087, 45.4123],
  "Lənkəran": [38.7529, 48.8475],
  "Şəki": [41.1975, 47.1707],
  "Quba": [41.3614, 48.5126],
  "Qəbələ": [40.9986, 47.8456],
  "Xaçmaz": [41.4631, 48.8019],
  "Şamaxı": [40.6314, 48.6411],
  "İsmayıllı": [40.7872, 48.1525],
  "Salyan": [39.5781, 48.9719],
  "Ağdaş": [40.6347, 47.4664],
  "Yevlax": [40.6172, 47.1500],
  "Bərdə": [40.3744, 47.1281],
  "Tovuz": [40.9939, 45.6306],
  "Qazax": [41.0950, 45.3661],
  "Goranboy": [40.6111, 46.7878],
  "Ağcabədi": [40.0533, 47.4592],
  "Beyləqan": [39.7722, 47.6156],
  "Cəlilabad": [39.2061, 48.4983],
  "Masallı": [39.0339, 48.6594],
  "Astara": [38.4561, 48.8728],
  "Zaqatala": [41.6311, 46.6444],
  "Qax": [41.4203, 46.9311],
  "Balakən": [41.7036, 46.4053],
  "Oğuz": [41.0708, 47.4647],
  "Şabran": [41.2147, 48.9869],
  "Siyəzən": [41.0772, 49.1117],
  "Xızı": [40.9111, 49.0742],
  "Abşeron": [40.5375, 49.7611],
  "Xırdalan": [40.4503, 49.7344],
};

export function getCityCenter(city?: string | null): [number, number] | null {
  if (!city) return null;
  return AZ_CITY_CENTROIDS[city] || AZ_CITY_CENTROIDS[city.trim()] || null;
}

// Default map center (Azerbaijan)
export const AZ_DEFAULT_CENTER: [number, number] = [40.3, 47.7];
export const AZ_DEFAULT_ZOOM = 7;

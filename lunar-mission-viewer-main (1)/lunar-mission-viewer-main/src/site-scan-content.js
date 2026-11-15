// Site facts describe observations, not the procedural ice drawn in the scene.
export const SITE_SCAN_INFO={
  'shackleton-rim':{
    about:'Shackleton is an impact crater at the lunar south pole. Its elevated rim receives extended periods of sunlight, while much of its deep interior stays in permanent shadow. That contrast makes it valuable for studying solar power and cold traps within a short distance of one another.',
    findings:'LRO laser measurements revealed the crater’s shape, steep walls, and unusual interior brightness. Possible ice is one explanation for some of that brightness; reduced space weathering can also explain it. These observations do not establish an exposed ice deposit on the rim.',
    history:'Lunar Reconnaissance Orbiter, launched in 2009, surveyed Shackleton using LOLA and orbital cameras. The instrument shown here represents that orbital investigation, rather than a spacecraft that landed on the rim.',
    sources:[['NASA · Sunlit rim and shadowed interior','https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/'],['NASA · Shackleton observations and ice uncertainty','https://ntrs.nasa.gov/citations/20120013758']]
  },
  'malapert-a':{
    about:'Malapert A is a crater in the Moon’s southern highlands, roughly 300 kilometers from the south pole. The waypoint marks the crater feature; the nearby Odysseus landing site is a separate location.',
    findings:'Odysseus returned engineering and science data from NASA payloads, including tests of navigation and landing technologies. Its mission was a technology and science delivery, not a confirmed discovery of water ice at Malapert A.',
    history:'Intuitive Machines’ IM-1 lander Odysseus touched down near Malapert A on February 22, 2024, carrying six NASA payloads through the CLPS initiative. It came to rest tilted on the surface; the upright model here is an educational exhibit.',
    sources:[['NASA · IM-1 landing and payloads','https://www.nasa.gov/centers-and-facilities/marshall/the-marshall-star-for-february-28-2024/']]
  },
  'mons-mouton':{
    about:'Mons Mouton is a broad, flat-topped mountain beside the western rim of Nobile crater. It spans nearly 100 kilometers and rises about 6 kilometers above surrounding terrain. Its name honors NASA mathematician and programmer Melba Roy Mouton.',
    findings:'Orbital studies identified sunny high ground, relatively gentle terrain, and nearby cold shadows of interest for volatile exploration. Athena returned some data, but its shortened mission did not establish a confirmed water-ice discovery at this site.',
    history:'Intuitive Machines’ IM-2 lander Athena touched down in the Mons Mouton region on March 6, 2025. It carried PRIME-1’s TRIDENT drill and MSolo mass spectrometer. The lander ended up on its side inside a crater, and the mission ended early on March 7.',
    sources:[['NASA · Mons Mouton terrain and namesake','https://www.nasa.gov/people-of-nasa/moon-mountain-name-honors-nasa-mathematician-melba-mouton/'],['NASA · IM-2 results','https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/']]
  },
  'nobile-rim':{
    about:'Nobile crater lies in rugged south-polar terrain beside Mons Mouton. Ridges and crater rims sit near shadowed depressions, creating a range of sunlight and temperature conditions useful for studying where lunar volatiles may survive.',
    findings:'LRO imagery maps craters, boulders, and terrain around Nobile Rim 1. Nearby permanently shadowed areas are promising places to investigate ice; the pictured rim mosaic is terrain evidence, not a direct measurement of ice at this waypoint.',
    history:'LRO surveyed this landscape from orbit. In 2021, NASA selected the mountainous area west of Nobile for its planned VIPER rover investigation. That selection was mission planning, rather than a completed VIPER landing or a discovery made on this rim.',
    sources:[['LROC · Nobile Rim 1 terrain mosaic','https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_MTMOUTONLO1'],['NASA · 2021 VIPER site selection','https://www.nasa.gov/news-release/nasas-artemis-rover-to-land-near-nobile-region-of-moons-south-pole/']]
  },
  'connecting-ridge':{
    about:'The Shackleton Connecting Ridge links the terrain between Shackleton and de Gerlache craters. Its narrow crest and adjoining slopes form a possible route through a landscape of deep shadows and elevated polar terrain.',
    findings:'LROC images and terrain mapping reveal boulders, small impact craters, and changes in slope along the ridge. Those obstacles matter for rover routes and landing safety. The mapped geology does not itself confirm ice on the ridge crest.',
    history:'LRO photographed and mapped the connecting ridge from lunar orbit. The orbiter displayed here represents that reconnaissance work; its position on the ground is illustrative and does not mark a spacecraft landing.',
    sources:[['LROC · Traversing the Shackleton–de Gerlache ridge','https://lroc.im-ldi.com/images/1247']]
  },
  'south-pole':{
    about:'Polar South represents the lunar south-polar region, with the geographic pole on Shackleton’s rim. Low-angle sunlight leaves some crater interiors permanently dark while nearby high ground receives much longer illumination.',
    findings:'Analysis published in 2018 of NASA’s Moon Mineralogy Mapper data from Chandrayaan-1 confirmed patchy surface water ice in polar shadows. LCROSS also detected water in material excavated at Cabeus. These regional results do not mean every polar site contains ice, or that there is a continuous ice cap.',
    history:'Chandrayaan-1 launched in 2008 and carried the Moon Mineralogy Mapper. LRO began mapping the Moon in 2009. On October 9, 2009, LCROSS and its Centaur stage intentionally impacted Cabeus crater, away from this exact pole marker, to investigate trapped water.',
    sources:[['NASA / JPL · Polar surface ice confirmed','https://www.jpl.nasa.gov/news/ice-confirmed-at-the-moons-poles/'],['NASA · LCROSS and Cabeus findings','https://science.nasa.gov/mission/lcross/']]
  }
};

export function siteScanContent(site){
  const info=SITE_SCAN_INFO[site.id];
  return `<div class="site-scan-details"><h3>About this site</h3><p>${info.about}</p>
    <h3>What was found</h3><p>${info.findings}</p>
    <h3>Missions &amp; exploration</h3><p>${info.history}</p>
    <div class="mission-sources">${info.sources.map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('<br>')}</div></div>`;
}


import supabase, { DB } from '../lib/db.js';
import { genererClassements, preparerTirage, tirerAuSortMatchs, trierFinales, distribuerMatchs, parseTime, ajouterMinutes } from '../lib/logic.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  try{
    const [conf, matchs] = await Promise.all([ DB.readConfigAsObject(), DB.listMatchs() ]);
    const live = { matchs: matchs.map(r => ({ id:r.id, h:r.heure, t:r.terrain, tour:r.poule, e1:r.equipe1, e2:r.equipe2, s1:r.score1, s2:r.score2 })) };
    const poules = genererClassements(live.matchs, conf);

    const nbTerrains = Number(conf.nbTerrains);
    const dureeMatch  = Number(conf.dureeMatch);
    const rotation    = Number(conf.rotation);
    const lastH       = (matchs.filter(m => !!m.heure).slice(-1)[0]?.heure) || conf.heureDebut;
    let hDebut        = ajouterMinutes(parseTime(lastH), dureeMatch + rotation);

    const nbEquipesParPoule = poules[0]?.classement?.length || 4;
    const tabs = [ { id:'C0', Rangs:[1,2], nom:'Principale' }, { id:'C1', Rangs:[3,4], nom:'Consolante 1' } ];
    if (nbEquipesParPoule >= 5) tabs.push({ id:'C2', Rangs:[5,6], nom:'Consolante 2' });

    const nbEquipesTotal = poules.length * nbEquipesParPoule;
    const eqParTab = nbEquipesTotal / tabs.length;
    const codeStart = eqParTab > 8 ? 'T8' : (eqParTab > 4 ? 'T4' : 'T2');
    const etapes = ['T8','T4','T2','T1'];
    const startIndex = etapes.indexOf(codeStart);

    const tous = [];
    tabs.forEach(tab => {
      const chapeaux = preparerTirage(poules, tab.Rangs[0], tab.Rangs[1]);
      const init = tirerAuSortMatchs(chapeaux, `${tab.id}_${codeStart}`);
      init.forEach((m,i)=>{ m.id = `F_${tab.id}_${codeStart}_M${i+1}`; m.s1=''; m.s2=''; tous.push(m); });
    });

    for (let i=startIndex; i<etapes.length-1; i++){
      const currTour = etapes[i];
      const nextTour = etapes[i+1];
      const matchsDuTour = tous.filter(m => (m.tour.split('_')[1] === currTour));
      const groupes = {};
      matchsDuTour.forEach(m => { const sfx = m.tour.split(currTour)[1] || ''; (groupes[sfx] ||= []).push(m); });
      Object.keys(groupes).forEach(sfx => {
        const liste = groupes[sfx].sort((a,b)=> String(a.id).localeCompare(String(b.id)) );
        for (let j=0;j<liste.length;j+=2){
          if (!liste[j+1]) break;
          const mNum = Math.ceil((j+2)/2);
          const tabId = liste[j].tour.split('_')[0];
          const nextSfxV = sfx + '_V';
          tous.push({ id:`F_${tabId}_${nextTour}_M${mNum}${nextSfxV}`, e1:'', e2:'', tour:`${tabId}_${nextTour}${nextSfxV}`, s1:`V:${liste[j].id}`, s2:`V:${liste[j+1].id}` });
          const nextSfxP = sfx + '_P';
          tous.push({ id:`F_${tabId}_${nextTour}_M${mNum}${nextSfxP}`, e1:'', e2:'', tour:`${tabId}_${nextTour}${nextSfxP}`, s1:`P:${liste[j].id}`, s2:`P:${liste[j+1].id}` });
        }
      });
    }

    trierFinales(tous);
    const planning = distribuerMatchs(tous, hDebut, nbTerrains, dureeMatch, rotation);

    const rows = planning.matchs.map(m => ({ id:m.id, heure:m.h, terrain:m.t, poule:m.tour, equipe1:m.e1||'', equipe2:m.e2||'', score1:null, score2:null, source1:m.s1||null, source2:m.s2||null }));

    const { error } = await supabase.from('matchs').insert(rows);
    if (error) throw error;

    res.status(200).json({ ok:true, added: rows.length });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'FINALES_FAILED', message: String(err?.message||err) });
  }
}

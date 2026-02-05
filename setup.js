
import { DB } from '../lib/db.js';
import { obtenirRotations, parseTime, fmtTime, ajouterMinutes } from '../lib/logic.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  try{
    const body = typeof req.body === 'object' && req.body || JSON.parse(req.body||'{}');
    const { config, equipesParPoule } = body;

    const existingConf = await DB.readConfigAsObject();
    const password = (config && config.Password) ?? existingConf.Password ?? '';
    await DB.replaceConfig({ ...config, Password: password });

    // Equipes
    let idEq=1; const rowsEquipes=[];
    const nomsPoules = Object.keys(equipesParPoule||{}).sort();
    for (const p of nomsPoules){
      for (const nom of equipesParPoule[p]) rowsEquipes.push({ id:idEq++, nom, poule:p });
    }
    await DB.replaceEquipes(rowsEquipes);

    // Liste brute
    const rotation = obtenirRotations(parseInt(config.format,10));
    const listeBrute = [];
    for (let i=0;i<rotation.length;i++){
      for (const p of nomsPoules){
        const e1 = (equipesParPoule[p]||[])[rotation[i][0]-1];
        const e2 = (equipesParPoule[p]||[])[rotation[i][1]-1];
        if (e1 && e2) listeBrute.push({ poule:p, e1, e2 });
      }
    }

    // Planning
    let hAct = parseTime(config.heureDebut);
    const hPause = parseTime(config.pause);
    const durMatch = Number(config.dureeMatch);
    const durRotation = Number(config.rotation||0);
    const nbT = Number(config.nbTerrains);
    const durPauseDej = Number(config.dureePause);

    const rowsMatchs = [];
    let matchId = 1;
    let indexBrut = 0;

    while (indexBrut < listeBrute.length){
      const occupe = new Set();
      let terrain = 1;
      while (terrain <= nbT && indexBrut < listeBrute.length){
        const m = listeBrute[indexBrut];
        if (occupe.has(m.e1) || occupe.has(m.e2)) break;
        rowsMatchs.push({ id:String(matchId++), heure: fmtTime(hAct), terrain, poule: m.poule, equipe1:m.e1, equipe2:m.e2, score1:null, score2:null, source1:null, source2:null });
        occupe.add(m.e1); occupe.add(m.e2);
        terrain++; indexBrut++;
      }
      hAct = ajouterMinutes(hAct, durMatch + durRotation);
      if (durPauseDej>0 && hAct >= hPause && hAct < ajouterMinutes(hPause, durPauseDej)){
        hAct = ajouterMinutes(hPause, durPauseDej);
      }
    }

    await DB.replaceMatchs(rowsMatchs);

    res.status(200).json({ ok:true, message: '✅ Tournoi planifié avec succès !' });
  }catch(err){
    console.error(err);
    res.status(500).json({ ok:false, error: 'SETUP_FAILED', message: String(err?.message||err) });
  }
}

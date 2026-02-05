
import { DB } from '../lib/db.js';
import { rebuildFromRows } from '../lib/logic.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  try{
    const body = typeof req.body === 'object' && req.body || JSON.parse(req.body||'{}');
    const { matchId, s1, s2 } = body;

    const score1 = (s1 === '' || s1 === null || s1 === undefined) ? null : Number(s1);
    const score2 = (s2 === '' || s2 === null || s2 === undefined) ? null : Number(s2);
    await DB.updateScore(matchId, score1, score2);

    const matchs = await DB.listMatchs();

    // Dictionnaire V/P
    const resultats = {};
    for (const r of matchs){
      if (r.score1 !== null && r.score2 !== null){
        resultats[String(r.id)] = {
          V: (Number(r.score1) > Number(r.score2)) ? r.equipe1 : r.equipe2,
          P: (Number(r.score1) > Number(r.score2)) ? r.equipe2 : r.equipe1
        };
      }
    }

    // Propagation des noms selon source1/source2
    const maj = [];
    for (const r of matchs){
      let n1 = r.equipe1, n2 = r.equipe2, modif=false;
      if (r.source1){
        const [type, idSrc] = String(r.source1).split(':');
        const attendu = resultats[idSrc]?.[type] ?? '';
        if (attendu && n1 !== attendu){ n1 = attendu; modif = true; }
      }
      if (r.source2){
        const [type, idSrc] = String(r.source2).split(':');
        const attendu = resultats[idSrc]?.[type] ?? '';
        if (attendu && n2 !== attendu){ n2 = attendu; modif = true; }
      }
      if (modif) maj.push({ id:r.id, equipe1:n1, equipe2:n2 });
    }

    if (maj.length) await DB.patchEquipeNames(maj);

    const conf = await DB.readConfigAsObject();
    const payload = rebuildFromRows(await DB.listMatchs(), conf);
    res.status(200).json(payload);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'SCORE_FAILED', message: String(err?.message||err) });
  }
}

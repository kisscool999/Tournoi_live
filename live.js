
import { DB } from '../lib/db.js';
import { rebuildFromRows } from '../lib/logic.js';

export default async function handler(req, res){
  try{
    const [conf, matchs] = await Promise.all([
      DB.readConfigAsObject(),
      DB.listMatchs()
    ]);
    const payload = rebuildFromRows(matchs, conf);
    res.status(200).json(payload);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'LIVE_FAILED', message: String(err?.message||err) });
  }
}

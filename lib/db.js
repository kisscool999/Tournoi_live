
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const DB = {
  async readConfigAsObject() {
    const { data, error } = await supabase.from('config').select('param, value');
    if (error) throw error;
    const conf = {};
    for (const row of data || []) conf[row.param] = row.value;
    return conf;
  },
  async replaceConfig(newConfig) {
    const rows = Object.entries(newConfig).map(([param, value]) => ({ param, value: String(value ?? '') }));
    await supabase.from('config').delete().neq('param', '');
    const { error } = await supabase.from('config').insert(rows);
    if (error) throw error;
  },
  async replaceEquipes(rows) {
    await supabase.from('equipes').delete().neq('id', 0);
    const { error } = await supabase.from('equipes').insert(rows);
    if (error) throw error;
  },
  async listEquipes() {
    const { data, error } = await supabase.from('equipes').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async replaceMatchs(rows) {
    await supabase.from('matchs').delete().neq('id', '');
    const { error } = await supabase.from('matchs').insert(rows);
    if (error) throw error;
  },
  async listMatchs() {
    const { data, error } = await supabase
      .from('matchs')
      .select('*')
      .order('heure', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async updateScore(id, score1, score2) {
    const { error } = await supabase
      .from('matchs')
      .update({ score1, score2 })
      .eq('id', String(id));
    if (error) throw error;
  },
  async patchEquipeNames(updates) {
    // updates: [{id, equipe1, equipe2}]
    for (const u of updates) {
      const { error } = await supabase
        .from('matchs')
        .update({ equipe1: u.equipe1, equipe2: u.equipe2 })
        .eq('id', String(u.id));
      if (error) throw error;
    }
  }
};

export default supabase;

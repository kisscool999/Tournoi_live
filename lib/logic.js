
// === Fonctions utilitaires de temps ===
function pad2(n){ return String(n).padStart(2,'0'); }
export function parseTime(s){
  if(!s) return new Date();
  const [hh, mm] = String(s).split(':');
  const d = new Date();
  d.setSeconds(0,0);
  d.setHours(Number(hh||0), Number(mm||0));
  return d;
}
export function fmtTime(d){
  if(!d || typeof d === 'string') return d || '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
export function ajouterMinutes(d, m){
  return new Date(d.getTime() + m*60000);
}

// === Logique métier issue de ton Apps Script ===
export function genererTirageAuSort(format, liste){
  for(let i=liste.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  let nbPoules;
  const f = parseInt(format,10);
  if (f <= 12) nbPoules = 2; // 8,10,12
  else if (f <= 24) nbPoules = 4; // 16,20,24
  else nbPoules = 8; // 32
  const eqParPoule = f / nbPoules;
  const poules = {};
  for(let i=0;i<nbPoules;i++){
    const nomPoule = String.fromCharCode(65+i);
    poules[nomPoule] = liste.slice(i*eqParPoule, (i+1)*eqParPoule);
  }
  return poules;
}

export function obtenirRotations(f){
  const format = parseInt(f,10);
  let nbParPoule;
  if (format===8 || format===16 || format===32) nbParPoule = 4;
  else if (format===10 || format===20) nbParPoule = 5;
  else if (format===12 || format===24) nbParPoule = 6;
  if (nbParPoule===4) return [[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]];
  if (nbParPoule===5) return [[2,4],[1,5],[3,4],[2,5],[1,3],[5,4],[2,3],[4,1],[3,5],[1,2]];
  if (nbParPoule===6) return [[1,2],[3,4],[5,6],[1,3],[4,6],[2,5],[1,4],[3,5],[2,6],[1,5],[3,6],[2,4],[1,6],[2,3],[4,5]];
  return [];
}

export function genererClassements(matchs, conf){
  const groupes = {};
  (matchs||[]).forEach(m => {
    if (m.tour && String(m.tour).length===1){
      (groupes[m.tour] ||= []).push(m);
    }
  });
  return Object.keys(groupes).sort().map(nomPoule => {
    const statsEquipes = {};
    groupes[nomPoule].forEach(m => {
      [m.e1, m.e2].forEach(e => {
        if (e && !statsEquipes[e]) statsEquipes[e] = { nom:e, pts:0, mj:0, bp:0, bc:0, diff:0 };
      });
      if (m.s1!=='' && m.s2!=='' && m.s1!==null && m.s2!==null){
        const s1 = parseInt(m.s1,10), s2 = parseInt(m.s2,10);
        const e1 = statsEquipes[m.e1], e2 = statsEquipes[m.e2];
        e1.mj++; e2.mj++;
        e1.bp += s1; e1.bc += s2;
        e2.bp += s2; e2.bc += s1;
        if (s1 > s2) e1.pts += 3; else if (s2 > s1) e2.pts += 3; else { e1.pts++; e2.pts++; }
        e1.diff = e1.bp - e1.bc; e2.diff = e2.bp - e2.bc;
      }
    });
    const classementTrie = Object.values(statsEquipes).sort((a,b)=>{
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.bp - a.bp;
    });
    classementTrie.forEach((eq,i)=> eq.rang = i+1);
    return { nom: `POULE ${nomPoule}`, classement: classementTrie.map(eq => ({ rang:eq.rang, equipe:eq.nom, pts:eq.pts, j:eq.mj, bp:eq.bp, diff:eq.diff })) };
  });
}

export function tirerAuSortMatchs(chapeaux, prefixe){
  let c1 = [...chapeaux.c1];
  let c2 = [...chapeaux.c2];
  let matchs = [];
  c2.sort(()=> Math.random()-0.5);
  for (let i=0;i<c1.length;i++){
    matchs.push({ tour: prefixe, e1: c1[i].equipe, e2: c2[i].equipe, p1: c1[i].poule, p2: c2[i].poule });
  }
  for (let i=0;i<matchs.length;i++){
    if (matchs[i].p1 === matchs[i].p2){
      for (let j=0;j<matchs.length;j++){
        if (matchs[i].p1 !== matchs[j].p2 && matchs[j].p1 !== matchs[i].p2){
          const temp = matchs[i].e2, tempP = matchs[i].p2;
          matchs[i].e2 = matchs[j].e2; matchs[i].p2 = matchs[j].p2;
          matchs[j].e2 = temp;         matchs[j].p2 = tempP;
          break;
        }
      }
    }
  }
  return matchs.map(m => ({ tour:m.tour, e1:m.e1, e2:m.e2 }));
}

export function distribuerMatchs(matchs, hDebut, nbT, dur, rot){
  let hAct = new Date(hDebut);
  let terr = 1;
  const matchesPlanifies = [];
  for (const m of matchs){
    const estGrandeFinale = String(m.tour).startsWith('C0_T1') && !String(m.tour).includes('P');
    if (estGrandeFinale){
      if (terr !== 1 && matchesPlanifies.some(prev => prev.h === fmtTime(hAct))){
        hAct = ajouterMinutes(hAct, Number(dur)+Number(rot));
      }
      m.h = fmtTime(hAct); m.t = 1; matchesPlanifies.push(m); terr = nbT + 1;
    } else {
      if (terr > nbT){ terr = 1; hAct = ajouterMinutes(hAct, Number(dur)+Number(rot)); }
      m.h = fmtTime(hAct); m.t = terr; matchesPlanifies.push(m); terr++;
    }
  }
  return { matchs: matchesPlanifies, heureFin: ajouterMinutes(hAct, Number(dur)+Number(rot)) };
}

export function preparerTirage(poules, rang1, rang2){
  const c1 = [], c2 = [];
  (poules||[]).forEach(p => {
    const eq1 = (p.classement||[]).find(e => Number(e.rang) === Number(rang1));
    const eq2 = (p.classement||[]).find(e => Number(e.rang) === Number(rang2));
    if (eq1) c1.push({equipe: eq1.equipe, poule: p.nom});
    if (eq2) c2.push({equipe: eq2.equipe, poule: p.nom});
  });
  return { c1, c2 };
}

export function trierFinales(tousLesMatchs){
  const ordreEtapes = { T8:1000, T4:2000, T2:3000, T1:4000 };
  const ordreTableaux = { C2:10, C1:20, C0:30 };
  function poidsParcours(tourStr){
    const parts = String(tourStr).split('_').slice(2);
    return parts.reduce((acc,val,idx)=> acc + (val==='V' ? Math.pow(2, 4-idx) : 0), 0);
  }
  tousLesMatchs.sort((a,b)=>{
    const etapeA = (String(a.tour).match(/T\d/)||[''])[0];
    const etapeB = (String(b.tour).match(/T\d/)||[''])[0];
    if (ordreEtapes[etapeA] !== ordreEtapes[etapeB]) return (ordreEtapes[etapeA]||0) - (ordreEtapes[etapeB]||0);
    const tabA = String(a.id).split('_')[1];
    const tabB = String(b.id).split('_')[1];
    if (ordreTableaux[tabA] !== ordreTableaux[tabB]) return (ordreTableaux[tabA]||0) - (ordreTableaux[tabB]||0);
    const pA = poidsParcours(a.tour), pB = poidsParcours(b.tour);
    if (pA !== pB) return pA - pB;
    return String(a.id).localeCompare(String(b.id));
  });
  return tousLesMatchs;
}

// Reconstruit le payload identique à GAS: {matchs, poules}
export function rebuildFromRows(matchRows, configObj){
  const matchs = (matchRows||[]).map(r => ({
    id: r.id,
    h: r.heure || '',
    t: r.terrain,
    tour: r.poule,
    e1: r.equipe1,
    e2: r.equipe2,
    s1: r.score1,
    s2: r.score2
  }));
  const poules = genererClassements(matchs, configObj||{});
  return { matchs, poules };
}

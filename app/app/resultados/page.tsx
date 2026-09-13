const rows=[
["Meta Ads","Cambiar creativo antes de reducir presupuesto","Acierto","CPA -21%","+32"],
["E-commerce","Mantener descuento 15%","Desacierto","Conversión -8%","-9"],
["Creativos","Elegir concepto B para test","Acierto","CTR +18%","+14"],
["Meta Ads","Excluir audiencia de baja calidad","Acierto","ROAS +0,7","+27"],
["CRO","Simplificar primer bloque de landing","Neutral","Sin diferencia","+1"],
];
export default function ResultsPage(){return <div className="pageStack"><section className="pageIntro"><div><span className="kicker">APRENDIZAJE</span><h1>Tus resultados.</h1><p>Lo importante no es acertar siempre. Es construir un historial verificable de criterio.</p></div></section><section className="metricStrip"><div className="metric"><span>Aciertos</span><strong>254</strong><em>77,7%</em></div><div className="metric"><span>Desaciertos</span><strong>73</strong><em>22,3%</em></div><div className="metric"><span>Valor medido</span><strong>$18,4M</strong><em>confianza media-alta</em></div><div className="metric"><span>Score ganado</span><strong>+184</strong><em>últimos 30 días</em></div></section><section className="sectionBlock"><div className="resultsTable"><div className="tableHeader"><span>Especialidad</span><span>Tu decisión</span><span>Resultado</span><span>Impacto</span><span>Score</span></div>{rows.map((r,i)=><div className="tableRow" key={i}><span>{r[0]}</span><strong>{r[1]}</strong><span className={`status ${r[2]==="Acierto"?"success":r[2]==="Desacierto"?"error":"neutral"}`}>{r[2]}</span><span>{r[3]}</span><span>{r[4]}</span></div>)}</div></section></div>}

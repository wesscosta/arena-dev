
"use client";
import { useEffect, useState } from "react";
import { fetchIntegrationOverview, type IntegrationOverview } from "@/lib/learning-platform-integration-api";
const LABEL={TEAMS:"Microsoft Teams",GOOGLE_CLASSROOM:"Google Classroom"} as const;
export default function IntegrationReadinessPanel({activityId}:{activityId:string}){
 const [data,setData]=useState<IntegrationOverview|null>(null); const [error,setError]=useState("");
 useEffect(()=>{let active=true; void fetchIntegrationOverview(activityId).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Falha ao carregar integrações.")}); return()=>{active=false}},[activityId]);
 return <section className="classroom-settings-card stack-sm"><div><span className="eyebrow accent">INTEGRAÇÕES EXTERNAS</span><h4>Prontidão de providers</h4><p>Arquitetura preparada sem ativar sincronização externa nesta etapa.</p></div>{error&&<div className="validation-box">{error}</div>}{data?.providers.map(p=><div key={p.provider} className="question-preview-card"><div className="grow"><strong>{LABEL[p.provider]}</strong><p>{p.linked?`Vinculada ao item externo ${p.externalAssignmentId}`:"Nenhuma atividade externa vinculada."}</p><small>{p.adapterConfigured?"Adapter configurado":"Adapter ainda não configurado"}</small></div></div>)}{!data&&!error&&<p>Carregando integrações...</p>}<small>Nenhum dado é enviado ao Teams/Classroom no 14.10.</small></section>;
}

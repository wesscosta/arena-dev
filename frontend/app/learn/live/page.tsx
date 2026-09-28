"use client";
import StudentJoinFlow from "@/components/StudentJoinFlow";
import styles from "../study.module.css";
export default function LivePage(){return <><p className={styles.eyebrow}>Arena ao vivo</p><h1 className={styles.title}>Entrar ao vivo</h1><p className={styles.lead}>Use o código exibido pelo professor para participar da sessão sem sair do seu espaço de estudo.</p><div className={styles.embeddedJoin}><StudentJoinFlow embedded/></div></>}

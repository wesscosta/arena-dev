-- v0.10/P1: classify pedagogical interventions without creating another assessment engine.
-- The existing note stays authoritative; baseline and follow-up still refer to InteractionRun.
alter table learning_intervention_cycles
    add column intervention_type varchar(24);

update learning_intervention_cycles
   set intervention_type = 'EXPLANATION'
 where status in ('INTERVENED', 'VERIFIED');

alter table learning_intervention_cycles
    add constraint ck_learning_cycle_intervention_type
        check (intervention_type is null or intervention_type in ('EXPLANATION', 'PEER_DISCUSSION')),
    add constraint ck_learning_cycle_intervention_recorded
        check ((status = 'DIAGNOSED' and intervention_type is null)
            or (status in ('INTERVENED', 'VERIFIED') and intervention_type is not null));

comment on column learning_intervention_cycles.intervention_type is
    'Teacher-selected intervention strategy. Peer discussion requires unrevealed baseline; no additional quiz runtime.';

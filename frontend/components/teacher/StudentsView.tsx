import { type Notify } from "@/components/ui";
import { StudentManager } from "./StudentManager";
import type { ArenaData } from "@/lib/types";

export function StudentsView({ data, classroomId, notify, refreshClassroomDomain }: {
  data: ArenaData;
  classroomId: string;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  return (
    <StudentManager
      data={data}
      classroomId={classroomId}
      notify={notify}
      refreshClassroomDomain={refreshClassroomDomain}
      showSummary
      showPageHeader
    />
  );
}

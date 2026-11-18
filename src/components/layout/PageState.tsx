import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";

// 화면 전체를 불러오는 동안 보여 주는 표시
export function PageLoading({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}

// 요청이 실패했을 때 그 자리에 보여 주는 안내
export function ErrorNote({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return <Banner status="error" title={message} endContent={action} />;
}

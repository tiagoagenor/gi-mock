import { MocksWorkspace } from "@/components/panel/mocks/mocks-workspace";

export default async function MockByHashPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  return <MocksWorkspace initialHash={hash} />;
}

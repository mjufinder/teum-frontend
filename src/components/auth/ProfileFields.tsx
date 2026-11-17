import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

interface ProfileFieldsProps {
  name: string;
  major: string;
  onNameChange: (value: string) => void;
  onMajorChange: (value: string) => void;
}

// 온보딩과 내 정보에서 함께 쓰는 이름·전공 입력
export default function ProfileFields({ name, major, onNameChange, onMajorChange }: ProfileFieldsProps) {
  return (
    <VStack gap={4}>
      <TextInput
        label="이름"
        size="lg"
        description="팀원에게 보이는 이름이에요."
        value={name}
        onChange={onNameChange}
        autoComplete="name"
      />
      <TextInput
        label="전공"
        size="lg"
        placeholder="예: 컴퓨터공학과"
        value={major}
        onChange={onMajorChange}
      />
    </VStack>
  );
}

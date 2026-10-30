type MemberLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default function MemberLayout({ children, modal }: MemberLayoutProps) {
  return <>{children}{modal}</>;
}

type ReportLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default function ReportLayout({ children, modal }: ReportLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

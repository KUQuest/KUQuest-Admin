type ConductReportLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default function ConductReportLayout({ children, modal }: ConductReportLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

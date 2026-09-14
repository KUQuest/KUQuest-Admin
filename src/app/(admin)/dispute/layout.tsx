type DisputeLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default function DisputeLayout({ children, modal }: DisputeLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

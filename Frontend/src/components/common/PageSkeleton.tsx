import { Card, Col, Row, Skeleton } from "antd";

export default function PageSkeleton() {
  return (
    <div className="page-loading-skeleton" aria-busy="true" aria-label="Loading page" style={{ padding: 24, width: "100%" }}>
      <Skeleton active title={{ width: "28%" }} paragraph={{ rows: 1 }} />
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {[0, 1, 2].map((item) => <Col xs={24} md={8} key={item}>
          <Card><Skeleton active title={{ width: "55%" }} paragraph={{ rows: 2 }} /></Card>
        </Col>)}
      </Row>
      <Card style={{ marginTop: 16 }}><Skeleton active title={{ width: "35%" }} paragraph={{ rows: 7 }} /></Card>
    </div>
  );
}

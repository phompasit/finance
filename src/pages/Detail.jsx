import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Badge,
  Text,
  VStack,
  HStack,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  Grid,
  GridItem,
  Card,
  CardBody,
  Button,
} from '@chakra-ui/react';

// ตัวอย่างข้อมูลทั้ง 3 แบบ
const sampleDataList = [
  {
    "_id": "opo_68fc8a281a2602db9762d881",
    "sourceType": "OPO",
    "sourceId": "68fc8a281a2602db9762d881",
    "serial": "OPO23",
    "date": "2025-10-25T00:00:00.000Z",
    "type": "OPO",
    "category": "OPO",
    "status": "PENDING",
    "requester": "ADMIN",
    "manager": "ADMIN",
    "createdBy": "MNG",
    "listAmount": [
      {
        "description": "ADMIN",
        "paymentMethod": "cash",
        "currency": "LAK",
        "amount": 600000,
        "reason": "ADMIN",
        "notes": "ADMIN",
        "_id": "68fc8a281a2602db9762d882"
      }
    ],
    "createdAt": "2025-10-25T08:28:24.054Z",
    "updatedAt": "2025-10-25T08:28:24.054Z"
  },
  {
    "_id": "trans_68fc33f425e5d2610bfd6641",
    "sourceType": "ລາຍຮັບ",
    "sourceId": "68fc33f425e5d2610bfd6641",
    "serial": "ertetteeteertsss",
    "date": "2025-10-25T00:00:00.000Z",
    "description": "sss",
    "type": "income",
    "category": "ລາຍຮັບ",
    "paymentMethod": "cash",
    "listAmount": [
      {
        "currency": "LAK",
        "amount": 80000,
        "_id": "68fc33f425e5d2610bfd6642"
      }
    ],
    "status": "paid",
    "notes": "hh",
    "createdAt": "2025-10-25T02:20:36.615Z",
    "updatedAt": "2025-10-25T02:20:36.615Z"
  },
  {
    "_id": "debt_68fc8a561a2602db9762d88f",
    "sourceType": "ໜີ້ຕ້ອງສົ່ງ",
    "sourceId": "68fc8a561a2602db9762d88f",
    "serial": "4093",
    "date": "2025-10-25T00:00:00.000Z",
    "description": "ADMIN",
    "type": "payable",
    "category": "ໜີ້ຕ້ອງສົ່ງ",
    "paymentMethod": "ໂອນ",
    "status": "ຄ້າງຊຳລະ",
    "listAmount": [
      {
        "currency": "THB",
        "amount": 100000,
        "_id": "68fc8a561a2602db9762d890"
      }
    ],
    "reason": "ADMIN",
    "notes": "ADMIN",
    "installments": [
      {
        "dueDate": "2025-10-25T00:00:00.000Z",
        "amount": 50000,
        "currency": "THB",
        "isPaid": false,
        "paidDate": null,
        "_id": "68fc8a561a2602db9762d891"
      },
      {
        "dueDate": "2025-11-07T00:00:00.000Z",
        "amount": 50000,
        "currency": "THB",
        "isPaid": false,
        "paidDate": null,
        "_id": "68fc8a561a2602db9762d892"
      }
    ],
    "createdAt": "2025-10-25T08:29:10.245Z",
    "updatedAt": "2025-10-25T08:29:10.245Z"
  }
];

const DetailView = ({ data }) => {
  const getStatusColor = (status) => {
    const statusColors = {
      'PENDING': 'yellow',
      'paid': 'green',
      'ຄ້າງຊຳລະ': 'red',
      'approved': 'blue',
      'APPROVED': 'blue',
    };
    return statusColors[status] || 'gray';
  };

  const getTypeColor = (type) => {
    const typeColors = {
      'OPO': 'purple',
      'income': 'green',
      'payable': 'orange',
      'expense': 'red',
    };
    return typeColors[type] || 'gray';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const InfoRow = ({ label, value, valueColor = "gray.800" }) => (
    <Grid templateColumns="200px 1fr" gap={4} py={2}>
      <Text fontSize="sm" color="gray.600" fontWeight="medium">{label}:</Text>
      <Text fontSize="sm" color={valueColor} fontWeight="medium">{value || '-'}</Text>
    </Grid>
  );

  // แสดงรายละเอียดแบบ OPO
  const renderOPODetails = () => (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນທົ່ວໄປ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ເລກທີ່ເອກະສານ" value={data.serial} valueColor="purple.600" />
          <InfoRow label="ປະເພດ" value={data.sourceType} />
          <InfoRow label="ໝວດໝູ່" value={data.category} />
          <InfoRow label="ວັນທີ່" value={formatDateShort(data.date)} />
          <InfoRow label="ສະຖານະ" value={
            <Badge colorScheme={getStatusColor(data.status)} fontSize="sm">
              {data.status}
            </Badge>
          } />
        </VStack>
      </Box>

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຜູ້ກ່ຽວຂ້ອງ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ຜູ້ຮ້ອງຂໍ" value={data.requester} />
          <InfoRow label="ຜູ້ຈັດການ" value={data.manager} />
          <InfoRow label="ສ້າງໂດຍ" value={data.createdBy} />
        </VStack>
      </Box>

      {data.listAmount && data.listAmount.length > 0 && (
        <Box>
          <Heading size="sm" mb={4} color="gray.700">ລາຍການຍອດເງິນ</Heading>
          {data.listAmount.map((amt, idx) => (
            <Card key={idx} mb={3} variant="outline" bg="purple.50" borderColor="purple.200">
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between" align="center">
                    <Text fontSize="sm" color="gray.600">ຍອດເງິນ:</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                      {formatCurrency(amt.amount, amt.currency)}
                    </Text>
                  </HStack>
                  <Divider />
                  <InfoRow label="ຄຳອະທິບາຍ" value={amt.description} />
                  <InfoRow label="ວິທີການຊຳລະ" value={
                    <Badge colorScheme="blue">{amt.paymentMethod}</Badge>
                  } />
                  <InfoRow label="ເຫດຜົນ" value={amt.reason} />
                  {amt.notes && <InfoRow label="ໝາຍເຫດ" value={amt.notes} />}
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Box>
      )}

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນລະບົບ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ສ້າງວັນທີ່" value={formatDate(data.createdAt)} />
          <InfoRow label="ອັບເດດວັນທີ່" value={formatDate(data.updatedAt)} />
          <InfoRow label="Source ID" value={data.sourceId} valueColor="gray.500" />
        </VStack>
      </Box>
    </VStack>
  );

  // แสดงรายละเอียดแบบ Income/Transaction
  const renderIncomeDetails = () => (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນທົ່ວໄປ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ເລກທີ່ເອກະສານ" value={data.serial} valueColor="green.600" />
          <InfoRow label="ປະເພດ" value={data.sourceType} />
          <InfoRow label="ໝວດໝູ່" value={data.category} />
          <InfoRow label="ວັນທີ່" value={formatDateShort(data.date)} />
          <InfoRow label="ສະຖານະ" value={
            <Badge colorScheme={getStatusColor(data.status)} fontSize="sm">
              {data.status}
            </Badge>
          } />
        </VStack>
      </Box>

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ລາຍລະອຽດ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ຄຳອະທິບາຍ" value={data.description} />
          <InfoRow label="ວິທີການຊຳລະ" value={
            <Badge colorScheme="green">{data.paymentMethod}</Badge>
          } />
          {data.notes && <InfoRow label="ໝາຍເຫດ" value={data.notes} />}
        </VStack>
      </Box>

      {data.listAmount && data.listAmount.length > 0 && (
        <Box>
          <Heading size="sm" mb={4} color="gray.700">ຍອດເງິນ</Heading>
          {data.listAmount.map((amt, idx) => (
            <Card key={idx} variant="outline" bg="green.50" borderColor="green.200">
              <CardBody>
                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.600">ຍອດເງິນທັງໝົດ:</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="green.600">
                    {formatCurrency(amt.amount, amt.currency)}
                  </Text>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </Box>
      )}

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນລະບົບ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ສ້າງວັນທີ່" value={formatDate(data.createdAt)} />
          <InfoRow label="ອັບເດດວັນທີ່" value={formatDate(data.updatedAt)} />
          <InfoRow label="Source ID" value={data.sourceId} valueColor="gray.500" />
        </VStack>
      </Box>
    </VStack>
  );

  // แสดงรายละเอียดแบบ Debt/Payable
  const renderDebtDetails = () => (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນທົ່ວໄປ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ເລກທີ່ເອກະສານ" value={data.serial} valueColor="orange.600" />
          <InfoRow label="ປະເພດ" value={data.sourceType} />
          <InfoRow label="ໝວດໝູ່" value={data.category} />
          <InfoRow label="ວັນທີ່" value={formatDateShort(data.date)} />
          <InfoRow label="ສະຖານະ" value={
            <Badge colorScheme={getStatusColor(data.status)} fontSize="sm">
              {data.status}
            </Badge>
          } />
        </VStack>
      </Box>

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ລາຍລະອຽດ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ຄຳອະທິບາຍ" value={data.description} />
          <InfoRow label="ວິທີການຊຳລະ" value={
            <Badge colorScheme="orange">{data.paymentMethod}</Badge>
          } />
          <InfoRow label="ເຫດຜົນ" value={data.reason} />
          {data.notes && <InfoRow label="ໝາຍເຫດ" value={data.notes} />}
        </VStack>
      </Box>

      {data.listAmount && data.listAmount.length > 0 && (
        <Box>
          <Heading size="sm" mb={4} color="gray.700">ຍອດເງິນທັງໝົດ</Heading>
          {data.listAmount.map((amt, idx) => (
            <Card key={idx} variant="outline" bg="orange.50" borderColor="orange.200">
              <CardBody>
                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.600">ຍອດເງິນທັງໝົດ:</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="orange.600">
                    {formatCurrency(amt.amount, amt.currency)}
                  </Text>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </Box>
      )}

      {data.installments && data.installments.length > 0 && (
        <Box>
          <Heading size="sm" mb={4} color="gray.700">ຕາຕະລາງການຜ່ອນຊຳລະ</Heading>
          <Card variant="outline">
            <CardBody p={0}>
              <Table variant="simple" size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>ລຳດັບ</Th>
                    <Th>ວັນທີ່ຄົບກຳນົດ</Th>
                    <Th isNumeric>ຍອດເງິນ</Th>
                    <Th>ສະຖານະ</Th>
                    <Th>ວັນທີ່ຊຳລະ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.installments.map((inst, idx) => (
                    <Tr key={idx} _hover={{ bg: 'gray.50' }}>
                      <Td fontWeight="medium">{idx + 1}</Td>
                      <Td>{formatDateShort(inst.dueDate)}</Td>
                      <Td isNumeric fontWeight="bold">
                        {formatCurrency(inst.amount, inst.currency)}
                      </Td>
                      <Td>
                        <Badge colorScheme={inst.isPaid ? 'green' : 'red'}>
                          {inst.isPaid ? 'ຊຳລະແລ້ວ' : 'ຍັງບໍ່ຊຳລະ'}
                        </Badge>
                      </Td>
                      <Td>
                        {inst.paidDate ? formatDateShort(inst.paidDate) : '-'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>

          <Card variant="outline" bg="orange.50" borderColor="orange.200" mt={3}>
            <CardBody>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.600">ສະຫຼຸບການຜ່ອນຊຳລະ</Text>
                  <Text fontSize="xs" color="gray.500">
                    ທັງໝົດ {data.installments.length} ງວດ
                  </Text>
                </VStack>
                <VStack align="end" spacing={1}>
                  <Text fontSize="sm" color="gray.600">
                    ຊຳລະແລ້ວ: {data.installments.filter(i => i.isPaid).length} ງວດ
                  </Text>
                  <Text fontSize="sm" color="orange.600" fontWeight="bold">
                    ຄ້າງຊຳລະ: {data.installments.filter(i => !i.isPaid).length} ງວດ
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        </Box>
      )}

      <Box>
        <Heading size="sm" mb={4} color="gray.700">ຂໍ້ມູນລະບົບ</Heading>
        <VStack align="stretch" divider={<Divider />} spacing={0}>
          <InfoRow label="ສ້າງວັນທີ່" value={formatDate(data.createdAt)} />
          <InfoRow label="ອັບເດດວັນທີ່" value={formatDate(data.updatedAt)} />
          <InfoRow label="Source ID" value={data.sourceId} valueColor="gray.500" />
        </VStack>
      </Box>
    </VStack>
  );

  // เลือกแสดงรายละเอียดตามประเภท
  const renderDetails = () => {
    if (data.type === 'OPO') return renderOPODetails();
    if (data.type === 'income') return renderIncomeDetails();
    if (data.type === 'payable') return renderDebtDetails();
    return <Text>ບໍ່ພົບຂໍ້ມູນ</Text>;
  };

  return (
    <Box bg="white" borderRadius="lg" shadow="md" p={6}>
      {/* Header */}
      <HStack justify="space-between" mb={6} pb={4} borderBottom="2px" borderColor="gray.200">
        <HStack spacing={3}>
          <Tag size="lg" colorScheme={getTypeColor(data.type)} fontSize="md">
            {data.sourceType}
          </Tag>
          <Heading size="md" color="gray.700">
            {data.serial}
          </Heading>
        </HStack>
        <Badge colorScheme={getStatusColor(data.status)} fontSize="md" px={3} py={1}>
          {data.status}
        </Badge>
      </HStack>

      {/* Content */}
      {renderDetails()}
    </Box>
  );
};

// Component หลักสำหรับทดสอบ (ในการใช้งานจริงจะรับ props data มาจากภายนอก)
const Detail = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedData = sampleDataList[selectedIndex];

  return (
    <ChakraProvider>
      <Box bg="gray.50" minH="100vh" py={8}>
        <Container maxW="container.lg">
          {/* ปุ่มเลือกดูตัวอย่าง */}
          <HStack spacing={3} mb={6}>
            <Button
              colorScheme={selectedIndex === 0 ? 'purple' : 'gray'}
              onClick={() => setSelectedIndex(0)}
            >
              OPO
            </Button>
            <Button
              colorScheme={selectedIndex === 1 ? 'green' : 'gray'}
              onClick={() => setSelectedIndex(1)}
            >
              ລາຍຮັບ
            </Button>
            <Button
              colorScheme={selectedIndex === 2 ? 'orange' : 'gray'}
              onClick={() => setSelectedIndex(2)}
            >
              ໜີ້ຕ້ອງສົ່ງ
            </Button>
          </HStack>

          {/* แสดงรายละเอียด */}
          <DetailView data={selectedData} />
        </Container>
      </Box>
    </ChakraProvider>
  );
};

export default Detail
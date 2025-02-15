import useSWR, { useSWRConfig } from 'swr';
import { useEffect } from 'react';
import { observer } from 'mobx-react';
import axios from 'axios';
import Pagination from '@Components/Pagination';
import Card from '@Components/Card';
import Table from '@Components/Table';
import FilterButton from '@Components/FilterButton';
import AddDeviceButton from '@Components/AddDeviceButton';
import SearchBar from '@Components/SearchBar';
import DummyCardEx from '@Dummy/DummyCardEx';
import dummyDevices from '@Dummy/deviceTableDummy';
import { fetcher } from '@Hooks/';
import Status from '@Components/UI/Status';
import ConfigButtons from '@Components/UI/ConfigButtons';
import DeviceForm from '@Components/Modal/ModalContent/DeviceForm';
import { remover } from '@Hooks/';
import store from '@Stores/deviceTable';

const DeviceTable = () => {
    const { page, limit, visibleData } = store;
    const {
        data: devicesData = {},
        mutate,
        error,
        isValidating,
    } = useSWR(`/devices?page=${page}&limit=${limit}`, url => fetcher(url), {
        revalidateOnFocus: false,
        compare: (a, b) => {
            return JSON.stringify(a?.data) === JSON.stringify(b?.data);
        },
    });

    const { count, data = [] } = devicesData;
    const stringData = JSON.stringify(data);

    const handleSearch = input => {
        const filtered = devicesData.filter(device => {
            return Object.keys(device).some(key => {
                return String(device[key]).toLowerCase().includes(input.toLowerCase());
            });
        });
        store.setVisibleData(filtered);
    };

    useEffect(() => {
        const formattedData = data.map(e => {
            const isLive = e['live'];
            return {
                ...e,
                live: <Status status={isLive ? 'CONNECT' : 'DISCONNECT'} />,
                activate: isLive,
            };
        });

        store.setVisibleData(formattedData);
    }, [stringData]);

    if (!devicesData) return <div>loading...</div>;

    return (
        <div id='deviceTable'>
            <div className='tableUtils'>
                <FilterButton />
                <SearchBar onClick={handleSearch} />
                <AddDeviceButton />
            </div>
            <Body tableData={visibleData} total={count} />
        </div>
    );
};

const Body = observer(props => {
    const { tableData = [], total } = props;
    const { mutate } = useSWRConfig();

    const handlePageChange = (current, pageSize) => {
        store.setPage(current);
    };

    const handleToggleActivate = async ({ row }, isActive) => {
        const deviceIdx = row.values.idx;

        const lazyMutate = () => {
            const { page, limit } = store;
            setTimeout(() => {
                mutate(`/devices?page=${page}&limit=${limit}`);
            }, 500);
        };
        const changeState = async () => {
            const body = { status: isActive };
            try {
                const response = await axios.post(`/devices/${deviceIdx}/status`, body);
                lazyMutate();
            } catch (error) {
                alert('error');
            }
        };

        changeState();
    };

    return (
        <>
            <Card>
                <div className='tableContent'>
                    <DummyCardEx height='670px'>
                        <Table
                            hasToggle
                            toggleId='idx'
                            toggleValueField='activate'
                            toggleHeader='에이전트 연결'
                            onToggleActivate={({ row }) => handleToggleActivate({ row }, true)}
                            onToggleInactivate={({ row }) => handleToggleActivate({ row }, false)}
                            defaultRowHeight='30'
                            defaultFontSize='14'
                            schema='simpleDevice'
                            browseData={tableData}
                            isTimestampFormattable
                            timestampHeader='update_time'
                            hasConfig
                            ConfigButtons={Configs}
                        />
                    </DummyCardEx>
                </div>
            </Card>
            <Pagination total={total} pageSize={store.limit} current={store.page} onChange={handlePageChange} />
        </>
    );
});

const Configs = observer(({ rowValues }) => {
    const { mutate } = useSWRConfig();
    const deviceIdx = rowValues.idx;
    const { page, limit } = store;

    const EditModal = () => {
        return <DeviceForm deviceIdx={deviceIdx} />;
    };

    const handleDelete = () => {
        const callback = () => {
            mutate(`/devices?page=${page}&limit=${limit}`);
        };
        remover(`/devices/${deviceIdx}`, null, callback);
    };

    return <ConfigButtons EditModal={EditModal} onDelete={handleDelete} />;
});

export default observer(DeviceTable);

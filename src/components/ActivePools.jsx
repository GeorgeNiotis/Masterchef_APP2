import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const ActivePoolsComp = (props) => {// or props.title
    const tableFn = () => {
        if (props.array === undefined) {
            return <TableRow key={0}>
                <TableCell>Loading...</TableCell>
            </TableRow>
        } else {
            return props.array[1].map((pool, i) => (
                <TableRow key={pool.lpTokenAddress}>
                    <TableCell>{i}</TableCell>
                    <TableCell component='th' >{pool.lpTokenAddress}</TableCell>
                    <TableCell align='center'>{pool.rewardPerBlock}</TableCell>
                    <TableCell align='center'>{pool.rewardPerBlockPercent}%</TableCell>
                </TableRow>
            ))
        }
    }
    return (
        <Paper sx={{ width: '70%', overflow: 'hidden', margin: 'auto', marginTop: '30px' }}>
            <h2 align='center'><font color='red'>Active pools</font></h2>
            <TableContainer sx={{ maxHeight: 550 }}>
                <Table stickyHeader aria-label='dense sticky table' size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>LPTokenAddress</TableCell>
                            <TableCell align='center'>reward</TableCell>
                            <TableCell align='center'>reward_per_block%</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableFn()}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

ActivePoolsComp.defaultProps = {
    title: 'Default ActivePoolsComp component!'
}

export default ActivePoolsComp

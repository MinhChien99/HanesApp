var mysql = require('mysql');
var dateFormat = require('dateformat');
const logHelper = require('./common/log.js');
var con1 = mysql.createPool({
    connectionLimit: 30,
    host: '10.113.99.3',
    user: 'root',
    password: '123456',
    database: 'linebalancing'
});
var con2 = mysql.createPool({
    connectionLimit: 60,
    // host: 'hyspayqsqlv',
    host: '10.113.99.3',
    user: 'root',
    // password: 'Hy$2020',
    password: '123456',
    database: 'erpsystem'
});
var con3 = mysql.createPool({
    connectionLimit: 60,
    host: "10.113.99.3",
    user: 'root',
    password: '123456',
    database: 'erphtml'
});
var con4 = mysql.createPool({
    host: "10.113.99.3",
    connectionLimit: 100,
    user: 'root',
    password: '123456',
    database: 'pr2k'
});

// var con5 = mysql.createPool({ 
//     connectionLimit: 60,
//     host: "10.113.99.3",
//     user: 'root',
//     password: '123456',
//     database: 'cutting_system'
// });
var con5 = mysql.createPool({ 
    connectionLimit: 60,
    host: "10.113.98.238",
    user: 'root',
    password: 'Hy$2020',
    database: 'cutting_system'
});

//cau hinh doc ejs
var express = require("express");
var app = express();
//cau hinh dang nhap voi user va password
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy;
//cau hinh python read - write
const { PythonShell } = require('python-shell');
var formidable = require('formidable');
var UserModel = require(__dirname + '/models/user.model.js');

// Realtime scan stamp Production
var staticResource = '//10.113.98.238/Realtime/Pilot';
var staticResource2 = '//10.113.98.238/Realtime'
var staticResource3 = '//10.113.98.238/Realtime/Scan lai/'
var staticResource4 = '//10.113.98.238/Realtime/not scan/'
var staticReport = '//pbvfps1/PBShare2/Scan/Report/ReportWebserver/'
app.use('/image', express.static(staticResource));
app.use('/image2', express.static(staticResource2));
app.use('/image3', express.static(staticResource3));
app.use('/image4', express.static(staticResource4));
app.use('/report', express.static(staticReport));

// Realtime scan stamp Cutting
var staticCuttingResource = '//10.113.98.238/Cutting/Pilot';
var staticCuttingResource2 = '//10.113.98.238/Cutting/'
var staticCuttingResource3 = '//10.113.98.238/Cutting/Scan lai/'
var staticCuttingResource4 = '//10.113.98.238/Cutting/not scan/'
app.use('/cutting/image', express.static(staticCuttingResource));
app.use('/cutting/image2', express.static(staticCuttingResource2));
app.use('/cutting/image3', express.static(staticCuttingResource3));
app.use('/cutting/image4', express.static(staticCuttingResource4));

app.use(express.static("public"));

app.use(session({
    secret: "secret",
    saveUninitialized: true,
    resave: true,
    cookie: {  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(
    express.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit:50000
    })
)
app.use(express.json())

const server = require('http').createServer(app);
const io = require('socket.io')(server);
app.set("socketio", io);    // <== this line
global.testIo = io;

server.listen(8000, 'localhost', function () {
    console.log('Server Start Running');
});

io.on('connection', (socket) => {
    // processing request
    socket.on('add-part-request', (data) => {
        console.log(socket.id + " Connected!");

        io.emit('add-part-request', {
            username: socket.username,
            message: data
        });
    });

    socket.on('update-part-request', (data) => {
        console.log(socket.id + " Connected!");

        io.emit('update-part-request', {
            username: socket.username,
            message: data
        });
    });

});

const constant = require('./common/constant');
var authController = require('./middleware/auth.controller');
app.get("/", authController.authenticate, function (request, response) {
    response.render("home", { ID: request.user });
});

app.get("/home", authController.authenticate, function (request, response) {
    response.render("home", { ID: request.user });
});

app.get("/error", function (request, response) {
    response.render("error");
});

// Innovation route
var innovationRoutes = require('./routes/innovation.routes');
app.use("/innovation", authController.authenticate, authController.authorizeDepartment([constant.Department.MEC]), innovationRoutes);

// System user route
var systemUserRoutes = require('./routes/user.routes');
app.use("/system-user", authController.authenticate, systemUserRoutes);

// Production route
var productionRoutes = require('./routes/production.routes');
app.use("/production", authController.authenticate, productionRoutes);

// Cutting route
var cuttingRoutes = require('./routes/cutting.routes');
app.use("/cutting", authController.authenticate, cuttingRoutes);

//======================================LOGIN==============================================

app.get("/login", function (request, response) {
    request.logout();
    response.render("login", { msg: "" });
});

app.post("/user", function (request, response) {
    if (request.user) {
        response.json(request.user);
    }
});

app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err)
            return next(err);

        if (!user.username)
            return res.render('login', { msg: user.message });

        req.logIn(user, function (err) {
            if (err)
                return next(err);
            get_dept(req.user.username, function (result) {
                console.log(result);
                user = result[0].User;
                dept = result[0].Department;
                position = result[0].Position;
                switch (dept) {
                    case 'QC':
                    case 'QA':
                        res.redirect("/QC/QC");
                        break;
                    case 'PR':
                    case 'AMTPR':
                    case 'IE':
                        if (position == 'Supervisor') {
                            get_sup_group(req.user.username, function (result) {
                                if (result.length > 0) 
                                    res.redirect("/Production/PayrollCheck", { group: result[0].NAMEGROUP, shift: result[0].SHIFT });
                                else 
                                    res.redirect("/Production/PayrollCheck");
                            });
                        }
                        else 
                            res.redirect("/Production/Production");
                        break;
                    case 'MEC':
                        res.redirect("/Innovation");
                        break;
                    case 'Cutting':
                        res.redirect("/Cutting");
                        break;
                    default:
                        // res.redirect("/home", { ID: req.user.username });
                        res.redirect("/home");
                }
            })
        });
    })(req, res, next);
});

passport.use(new LocalStrategy(
    (username, password, done) => {
        con2.getConnection(function (err, connection) {
            if (err) {
                return done(err);
            }
            connection.query("SELECT User, Password, Position, Name, Roles, Department, Email FROM setup_user where User='" + username + "';", function (err, result, fields) {
                connection.release();
                if (err) {
                    return done(err);
                }
                if (result.length <= 0) {
                    return done(null, { status: false, message: "Không tồn tại user" });
                }

                if (result.length > 0) {
                    user = result[0];
                    if (password != user.Password) {
                        return done(null, { status: false, message: "Sai mật khẩu" });
                    }

                    // return done(null, username)
                    user.Roles = user.Roles ? user.Roles : "";
                    let roles = user.Roles.split(",").map(function(val){
                        return parseInt(val);
                    })
                    var userLogin = new UserModel(user.User, user.Name, user.Department, user.Position, roles, user.Email, null, user.Password);
                    return done(null, userLogin);
                }
            });
        });
    }
));
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
function get_dept(user, callback) {
    var dept = '';
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("SELECT User, Department, Position FROM setup_user where User='" + user + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                // dept=result[0].Department;
                return callback(result);
            }
        });
    });
    return dept;
}
function get_date_infor(date, callback) {
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("select StartTime, FinishTime, Shift, Note, Week from operation_schedule where DATE='" + date + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                // dept=result[0].Department;
                return callback(result);
            }
        });
    });
    // return dept;
}
function get_sup_group(user, callback) {
    var dept = '';
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("SELECT IF(GR_RIT IS NULL, GR_BAL, GR_RIT) NAMEGROUP, IF(SUP_RIT IS NULL, 'B', 'R') SHIFT FROM "
            + " (SELECT g1.NameGroup GR_RIT, g2.NameGroup GR_BAL, g1.SupervisorRitmo SUP_RIT, g2.SupervisorBali SUP_BAL "
            + " FROM (SELECT NAME FROM setup_user WHERE USER='" + user + "') AS Temp1 "
            + " left JOIN setup_group g1 ON g1.SUPERvisorRitmo=Temp1.NAME "
            + " left JOIN setup_group g2 ON g2.SUPERvisorBali=Temp1.NAME) t2 GROUP BY SHIFT;", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // dept=result[0].Department;
                    return callback(result);
                }
            });
    });
    return dept;
}
io.sockets.on('connection', function (socket) {
    // socket.on('call-auto-kanban', function(data){
    //     console.log('client receive message', data);
    //     io.sockets.emit('client-response-warehouse', data);
    // });
    socket.on('warehouse-send-kanban', function (data) {
        console.log('warehouse send message', data);
        io.sockets.emit('client-receive-kanban', data);
    });
    socket.on('client-send-kanban', function (data) {
        console.log('client send message', data);
        io.sockets.emit('warehouse-receive-kanban', data);
    });
    //cutpart checkin
    socket.on('submit-cutpart-checkin', function (barcode) {
        // console.log('barcode: ', barcode);
        con2.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT SHIFT, WORKLOT, OUTPUT, MOONROCKNUMBER, TOTALMOONROCK, TIMESCAN, PRINTCODE FROM data_scancutpartcutting where Barcode='" + barcode + "';";
            if (barcode.length == 6)
                sql = "SELECT SHIFT, WORKLOT, OUTPUT, MOONROCKNUMBER, TOTALMOONROCK, TIMESCAN, PRINTCODE FROM data_scancutpartcutting where Worklot='" + barcode + "';";
            connection.query(sql, function (err, result, fields) {
                if (err) throw err;
                if (result.length > 0) {
                    con2.getConnection(function (err, connection) {
                        if (err) {
                            throw err;
                        }
                        // console.log('barcode result');
                        // console.log(result);
                        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
                        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
                        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
                        sql2 = "UPDATE data_scancutpartcutting set SewingWH='" + timeUpdate + "' where Barcode='" + barcode + "';";
                        if (barcode.length == 6) sql2 = "UPDATE data_scancutpartcutting set SewingWH='" + timeUpdate + "' where Worklot='" + barcode + "';"
                        connection.query(sql2, function (err, result2, fields) {
                            connection.release();
                            if (err) throw err;
                            io.sockets.emit('cutpart-checkin-result', JSON.stringify(result));
                        });
                    });
                } else {
                    io.sockets.emit('cutpart-checkin-result', "error");
                }
            });
        });

    });
});
app.post("/login_user", function (req, res) {
    res.send(req.user.username);
    res.end();
});
app.post("/Get_Week", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "select WEEK from operation_schedule where DATE='" + date + "';";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post("/Get_RFID", function (req, res) {
    rfid = req.body.rfid;
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        // sql = "select e.ID, e.Name, e.Shift, e.Line, e.Dept, e.Position from erpsystem.setup_rfidemplist r inner join erpsystem.setup_emplist e "
        //     + " on r.EmployeeID=e.ID where r.CardNo='" + rfid + "' or e.ID='" + rfid + "';";
        sql = `select e.ID, e.Name, e.Shift, e.Line, e.Dept, e.Position, e.Section from erpsystem.setup_emplist e where e.ID = '${rfid}'`;
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post("/Get_User_Infor", function (req, res) {
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("SELECT User, Department, Position FROM setup_user where User='" + req.user.username + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
//=====================================EMPLOYEE===========================================


//=====================================FINANCE=============================================
app.get("/Finance/Finance_page", function (request, res) {
    if (request.isAuthenticated()) {
        res.render("Finance/Finance_page");
    }
    else {
        res.render("login");
    }
});

app.get("/Finance/Export_Reports", function (request, res) {
    if (request.isAuthenticated()) {
        get_dept(request.user, function (result) {
            console.log(result);
            user = result[0].User;
            dept = result[0].Department;
            position = result[0].Position;
            if (request.user == 'dule4' || dept == 'FI') res.render("Finance/ExportReports");
            else res.send('You dont have permission to access this page!');
        });
    }
    else {
        res.render("login");
    }
});

app.post('/Finance/Export_Reports/Incentive_Report_Production', function (req, res) {
    req.setTimeout(1000000);
    datefrom = req.body.datefrom;
    dateto = req.body.dateto;
    var options = {
        mode: 'text',
        pythonPath: 'python',
        scriptPath: './public/Python/Finance/ExportReports',
        pythonOptions: ['-u'], // get print results in real-time
        args: [datefrom, dateto]
    };
    console.log('Incentive Production', datefrom, dateto);
    let shell = new PythonShell('IncentiveProduction.py', options);
    shell.on('message', function (message) {
        console.log(message);
        res.send(message);
        res.end();
    });
});

//=====================================PLANNING=============================================

//=====================================PRODUCTION==========================================
app.get("/Production/Production", function (req, res) {
    res.render("Production/Production");
});
app.post("/Production/Production/GroupSummary", function (req, res) {
    var date = req.body.date;
    console.log(date);
    con4.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        // connection.query("SELECT COUNT(DISTINCT employee_scanticket.BUNDLE)*3 as OUTPUT, worklot_active.LOCATION "
        //     + "FROM employee_scanticket left JOIN worklot_active ON employee_scanticket.WORK_LOT=worklot_active.WORK_LOT "
        //     + "WHERE employee_scanticket.DATE='" + date + "' AND employee_scanticket.WORK_LOT IS NOT NULL AND QC!='000000'"
        //     + "GROUP BY worklot_active.LOCATION;", function (err, result, fields) {
        //         connection.release();
        //         if (err) throw err;
        //         if (result.length > 0) {
        //             // console.log(result);
        //             res.send(result);
        //             res.end();
        //         } else {
        //             res.send({ result: 'empty' });
        //             res.end();
        //         }
        //     });

        connection.query("SELECT COUNT(DISTINCT employee_scanticket.BUNDLE)*3 as OUTPUT, prodoutput.LINE AS LOCATION "
            + "FROM employee_scanticket JOIN prodoutput ON employee_scanticket.WORK_LOT=prodoutput.WLOT_ID "
            + "WHERE SUBSTRING(employee_scanticket.DATE, 1, 10)='" + date + "' AND employee_scanticket.WORK_LOT IS NOT NULL AND QC!='000000'"
            + "GROUP BY prodoutput.LINE;", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
    });
});
app.post("/Production/Payroll_Search/GroupOutput", function (req, res) {
    var groupName = req.body.group;
    var shift = req.body.shift;
    var date = req.body.date;
    var dateFile = req.body.dateFile;
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        groupF = groupName.substring(0, 3);
        groupT = groupName.substring(4, 7);
        if (groupF == '059') {
            groupF = '060';
            groupName = '059-066';
        }
        if (groupT == '059') {
            groupT = '058';
            groupName = '051-059';
        }
        if (groupF == '346') {
            groupF = '347';
            groupName = '347-353';
        }
        shiftT = shift.substring(0, 1);
        groupD = groupF + groupT + shiftT + dateFile;
        sql = "select Operation, COUNT(DIstinct ID) as HC, ROUND(COUNT(DISTINCT BUNDLE)*UNITS/12) as OUTPUT from "
            + " (select LEFT(Ticket,6) as BUNDLE, ID, OPERATION, EARNED_HOURS, UNITS "
            + " from pr2k.employee_scanticket ticket inner join "
            + " (select RIGHT(ID,5) as EMPLOYEE, ID, Name, Line "
            + " from setup_emplist inner join setup_location "
            + " on setup_emplist.Line=setup_location.Location "
            + " where NameGroup='" + groupName + "' and Shift like '" + shiftT + "%' group by ID) as Temp1 on ticket.EMPLOYEE=Temp1.EMPLOYEE "
            + " where ticket.DATE='" + date + "' order by Line) as Temp2 where Operation is not null group by Operation; "
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                res.send(result);
                res.end();
            } else {
                res.send({ result: 'empty' });
                res.end();
            }
        });
    });
});
app.post("/Production/Payroll_Search/GroupReport", function (req, res) {
    var groupName = req.body.group;
    var shift = req.body.shift;
    var date = req.body.date;
    groupF = groupName.substring(0, 3);
    groupT = groupName.substring(4, 7);
    if (groupF == '059') {
        groupF = '060';
        groupName = '059-066';
    }
    if (groupT == '059') {
        groupT = '058';
        groupName = '051-059';
    }
    if (groupF == '346') {
        groupF = '347';
        groupName = '347-353';
    }
    // console.log(group, shift, date);
    // var options={
    //     mode: 'json',
    //     pythonPath: 'python',
    //     scriptPath: './public/Python/Production/ReportUpdate',
    //     pythonOptions: ['-u'], // get print results in real-time
    //     args:[group, shift, date]
    // };
    // let shell=new PythonShell('Group_Report.py', options);
    // shell.on('message', function(message) {
    //     res.setHeader("Content-Type", "application/json");
    //     console.log(message);
    //     res.send(message);
    //     res.end();
    // });

    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        var sql = "select ID, Name, Line, CONCAT(OPERATION_CODE,' - ', OPERATION) as Operation, COUNT(Ticket) as Bundle, SUM(EARNED_HOURS) as SAH "
            + " from pr2k.employee_scanticket ticket inner join "
            + " (select RIGHT(ID,5) as EMPLOYEE, ID, Name, Line "
            + " from setup_emplist inner join setup_location "
            + " on setup_emplist.Line=setup_location.Location "
            + " where NameGroup='" + groupName + "' and Shift like '" + shift + "%' group by ID) as Temp1 on ticket.EMPLOYEE=Temp1.EMPLOYEE "
            + " where ticket.DATE='" + date + "'"
            + " group by Temp1.Employee, OPERATION order by OPERATION;";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                // console.log(result);
                res.send(result);
                res.end();
            } else {
                res.send({ result: 'empty' });
                res.end();
            }
        });
    });
});
app.get("/Production/PayrollCheck", function (req, res) {
    if (req.isAuthenticated()) {
        // get_sup_group(req.user.username, function (result) {
        //     if (result.length > 0) res.render("Production/PayrollCheck", { group: result[0].NAMEGROUP, shift: result[0].SHIFT });
        //     else res.render("Production/PayrollCheck");
        // });

        get_sup_group(req.user.username, function (result) {
            if (result.length > 0) res.render("Production/PayrollCheck", { group: result[0].NAMEGROUP, shift: result[0].SHIFT });
            else res.render("Production/PayrollCheck");
        });
    }
    else {
        res.render("login", { msg: "" });
    }
});
app.get("/Production/PayrollCheck1", function (req, res) {
    if (req.isAuthenticated()) {
        var sql = "SELECT g1.NameGroup, g2.NameGroup, g1.SupervisorRitmo, g2.SupervisorBali "
            + " FROM (SELECT NAME FROM setup_user WHERE USER='nghong') AS Temp1 "
            + " left JOIN setup_group g1 ON g1.SUPERvisorRitmo=Temp1.NAME "
            + " left JOIN setup_group g2 ON g2.SUPERvisorBali=Temp1.NAME;";
        con2.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    // res.send(result);

                    res.render("Production/PayrollCheck1", {});
                    // res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });

    }
    else {
        res.render("login");
    }
});
app.get("/Production/PayrollCheckOld", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Production/PayrollCheckOld");
    }
    else {
        res.render("login");
    }
});
app.post('/Production/Payroll_Search/Group', function (req, res) {
    if (req.isAuthenticated()) {
        var groupName = req.body.group;
        var date = req.body.date;
        // var bundle=req.body.bundle;
        var year = date.substring(0, 4);
        var month = date.substring(4, 6);
        var day = date.substring(6, 8);
        var dateFull = day + '-' + month + '-' + year;
        console.log(dateFull);
        var image_list;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("SELECT COUNT(BUNDLE) as COUNT_BUNDLE, QC, SUM(IS_FULL) AS IS_FULL, FILE, TimeUpdate, TimeModified, BUNDLE "
                + "FROM employee_scanticket "
                + "WHERE FILE LIKE '" + groupName + "_" + dateFull + "%'"// AND DATE='" + date + "' "
                + "GROUP BY FILE ORDER BY FILE DESC;", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        // console.log(result);
                        image_list = result;
                        var error_list;
                        con4.getConnection(function (err, connection) {
                            if (err) {
                                throw err;
                            }
                            // connection.query("SELECT FILE from bundleticket_error where DATE='"+date+"' and FILE like '"+group+"%';", function (err, result, fields) {
                            connection.query("SELECT FILE from bundleticket_error where FILE like '" + groupName + "_" + dateFull + "%' and MODIFIED IS NULL;", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    error_list = result;
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                } else {
                                    error_list = 'empty';
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                }
                            });
                        });
                    } else {
                        res.send({ image_list: 'empty' });
                        res.end();
                    }
                });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Production/Payroll_Search/GroupNew', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var groupName = req.body.group;
            var date = req.body.date;
            console.log(groupName)
            // var bundle=req.body.bundle;
            var year = date.substring(0, 4);
            var month = date.substring(4, 6);
            var day = date.substring(6, 8);
            var dateFull = day + '-' + month + '-' + year;
            var image_list;
            con4.getConnection(function (err, connection) {
                if (err) throw err;
                sql = "";
                if (date >= '20200712') {
                    sql = "SELECT Temp4.ISSUE_FILE, LEFT(Temp4.TICKET, 6) AS BUNDLE, max(QC) as QC, COUNT(Temp4.TICKET) AS ISSUE, COUNT(EMPLOYEE) AS SCAN, COUNT(deactive.TICKET) AS IASCAN, COUNT(Temp4.TICKET)-COUNT(EMPLOYEE)-COUNT(deactive.TICKET) AS IS_FULL, MAX(Temp4.FILE) as FILE, Temp4.TimeUpdate, TimeModified FROM "
                        + " (SELECT Temp3.FILE AS ISSUE_FILE, Temp3.TICKET, scan.QC, scan.EMPLOYEE, scan.FILE, scan.TimeUpdate, scan.TimeModified FROM employee_scanticket scan RIGHT JOIN "
                        + " (SELECT TICKET, active2.FILE FROM bundleticket_active active2 INNER JOIN (SELECT distinct active.FILE FROM bundleticket_active active "
                        + " INNER JOIN (SELECT TICKET FROM employee_scanticket where FILE LIKE '" + groupName + "_" + dateFull + "%') AS Temp1 "
                        + " ON active.TICKET=Temp1.TICKET) AS Temp2 ON active2.`FILE`=Temp2.FILE WHERE active2.FILE!='0') AS Temp3 ON Temp3.TICKET=scan.TICKET) AS Temp4  LEFT JOIN bundleticket_deactive deactive ON Temp4.TICKET=deactive.TICKET "
                        + " GROUP BY Temp4.ISSUE_FILE;"
                } else {
                    sql = "SELECT COUNT(BUNDLE) as COUNT_BUNDLE, QC, SUM(IS_FULL) AS IS_FULL, FILE, TimeUpdate, TimeModified, BUNDLE "
                        + "FROM employee_scanticket "
                        + "WHERE FILE LIKE '" + groupName + "_" + dateFull + "%'"// AND DATE='" + date + "' "
                        + "GROUP BY FILE ORDER BY FILE DESC;"
                }
                console.log(sql)
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        // console.log(result);
                        image_list = result;
                        var error_list;
                        con4.getConnection(function (err, connection) {
                            if (err) {
                                throw err;
                            }
                            // connection.query("SELECT FILE from bundleticket_error where DATE='"+date+"' and FILE like '"+group+"%';", function (err, result, fields) {
                            connection.query("SELECT FILE from bundleticket_error where FILE like '" + groupName + "_" + dateFull + "%' and MODIFIED IS NULL;", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    error_list = result;
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                } else {
                                    error_list = 'empty';
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                }
                            });
                        });
                    } else {
                        res.send({ image_list: 'empty' });
                        res.end();
                    }
                });
            });
        }
        else {
            res.render("login");
        }
    }
    catch (error) {
        logHelper.writeLog("Production/Payroll_Search/GroupNew", error);
    }
});
app.post("/Production/Payroll_Search/GroupMultipleOperations", function (req, res) {
    try {
        var groupName = req.body.groupName;
        var date = req.body.date;
        // console.log(group, date);
        con4.getConnection(function (err, connection) {
            if (err) {
                connection.release();
                throw err;
            }
            var sql = ("SELECT * FROM "
                + "(SELECT EMPLOYEE, COUNT(DISTINCT OPERATION_CODE) AS OP_CODE, COUNT(TICKET) AS TICKET, FILE, QC, SUM(IS_FULL) as SUM_FULL FROM employee_scanticket "
                + " WHERE DATE='" + date + "' AND FILE LIKE '" + groupName + "%'"
                + " GROUP BY EMPLOYEE, FILE ) AS TEMP "
                + " WHERE TEMP.OP_CODE>1 and SUM_FULL<200;");
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/GroupMultipleOperations", error);
    }
});
app.post('/Production/Payroll_Search/GroupOld', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var groupName = req.body.groupName;
            var date = req.body.date;
            var image_list;
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                var sql = ("SELECT COUNT_BUNDLE, QC, IS_FULL, FILE, TimeUpdate, BUNDLE "
                    + " FROM (SELECT COUNT(BUNDLE) as COUNT_BUNDLE, QC, SUM(IS_FULL) AS IS_FULL, FILE, TimeUpdate, BUNDLE "
                    + " FROM employee_scanticket "
                    + " WHERE FILE like '" + groupName + "%' AND DATE='" + date + "' "
                    + " GROUP BY FILE ORDER BY TimeUpdate) AS TempTable where IS_FULL=0;")
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        image_list = result;
                        var error_list;
                        con4.getConnection(function (err, connection) {
                            if (err) {
                                connection.release();
                                throw err;
                            }
                            connection.query("SELECT FILE from bundleticket_error where DATE='" + date + "' and FILE like '" + groupName + "%' and Modified is null;", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    error_list = result;
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                } else {
                                    error_list = 'empty';
                                    res.send({ image_list: image_list, error_list: 'empty' });
                                    res.end();
                                }
                            });
                        });
                    } else {
                        con4.getConnection(function (err, connection) {
                            if (err) {
                                connection.release();
                                throw err;
                            }
                            // res.send({image_list:'empty'});
                            connection.query("SELECT FILE from bundleticket_error where DATE='" + date + "' and FILE like '" + groupName + "%' and MODIFIED is nULL;", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    error_list = result;
                                    res.send({ image_list: 'empty', error_list: error_list });
                                    res.end();
                                } else {
                                    error_list = 'empty';
                                    res.send({ image_list: 'empty', error_list: 'empty' });
                                    res.end();
                                }
                            });
    
                            // res.end();
                        });
                    }
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/GroupOld", error);
    }
});
app.post('/Production/Payroll_Search/Submit', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var bundle = req.body.bundle;
            var ID = req.body.ID;
            var QC = req.body.QC;
            var file = req.body.file;
            var date = req.body.date;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            console.log(ID, bundle, date, bundle.substring(0, 6), bundle.substring(6, 10), QC, timeUpdate, req.user.username, file);
            con4.getConnection(function (err, connection) {
                if (err) {
                    connection.release();
                    throw err;
                }
                connection.query("select EMPLOYEE from employee_scanticket where TICKET='" + bundle + "';", function (err, result, fields) {
                    if (err) throw err;
                    // console.log(result);
                    // res.setHeader("Content-Type", "application/json");
                    if (result.length == 0) {
                        console.log('insert ', ID);
                        connection.query("replace into employee_scanticket"
                            + " (TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, IRR, QC, FILE, IS_FULL, MODIFIED, TimeUpdate)"
                            + " values ('" + bundle + "', '" + ID + "', '" + date + "','" + bundle.substring(0, 6) + "', '" + bundle.substring(6, 10) + "','000','" + QC + "','" + file + "','100','" + req.user.username + "', '" + timeUpdate + "')", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                res.setHeader("Content-Type", "application/json");
                                res.send({ result: 'done' });
                                // next();
                                res.end();
                            });
                    } else {
                        console.log('update ', ID);
                        connection.query("update employee_scanticket set EMPLOYEE='" + ID + "', QC='" + QC + "', IS_FULL='100', MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "', FILE='" + file + "' where TICKET='" + bundle + "';", function (err, result, fields) {
                            connection.release();
                            if (err) throw err;
                            res.setHeader("Content-Type", "application/json");
                            res.send({ result: 'done' });
                            // next();
                            res.end();
                        });
                    }
    
                    // res.send({result:'done'});
                    // res.end();
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Submit", error);
    }
});
app.post('/Production/Payroll_Search/Submit1', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var bundle = req.body.bundle;
            var ID = req.body.ID;
            var QC = req.body.QC;
            var file = req.body.file;
            var date = req.body.date;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            console.log(ID, bundle, date, bundle.substring(0, 6), bundle.substring(6, 10), QC, timeUpdate, req.user.username, file);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("replace into employee_scanticket"
                    + " (TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, IRR, QC, FILE, IS_FULL, MODIFIED, TimeUpdate)"
                    + " values ('" + bundle + "', '" + ID + "', '" + date + "','" + bundle.substring(0, 6) + "', '" + bundle.substring(6, 10) + "','000','" + QC + "','" + file + "','100','" + req.user.username + "', '" + timeUpdate + "')", function (err, result, fields) {
                        connection.release();
                        if (err) throw err;
                        res.send({ result: 'done' });
                        res.end();
                    });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Submit1", error);
    }
});
app.post('/Production/Payroll_Search/GetName', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var ID = req.body.ID;
            con2.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("Select Name, ID, Line, Shift from setup_emplist where ID like '%" + ID + "' and Type='DR';", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
    
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/GetName", error);
    }
});
app.post('/Production/Payroll_Search/GetTimeSheet', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var ID = req.body.ID;
            var date = req.body.date;
            var datefrom = req.body.datefrom;
            console.log(date, datefrom);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "Select ROUND(SUM(WORK_HRS),2) AS WORK_HRS, ROUND(SUM(REG_HRS),2) AS REG_HRS, ROUND(SUM(OT15+OT20+OT30),2) as OT, ROUND(SUM(CD03),2) AS CD03, ROUND(SUM(CD08),2) AS CD08, ROUND(SUM(CD09),2) AS CD09 "
                    + " from employee_timesheet where ID like '" + ID + "%' AND DATE<='" + date + "' AND DATE>='" + datefrom + "';"
                console.log(sql);
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    console.log(result);
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
    
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/GetTimeSheet", error);
    }
});
app.post('/Production/Payroll_Search/GetWip', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var groupName = req.body.group;
            var date = req.body.date;
            var shift = req.body.shift.substring(0, 1);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "select OPERATION, SUM(WIP) as WIP, WIP_TARGET as TARGET, SUM(WIP)-WIP_TARGET as VAR, SUM(SUM_WIP) as SUM_WIP, SUM(SUM_HC) as SUM_HC "
                    + " from operation_wip where DATE='" + date + "' and LINE='" + groupName + "' and SHIFT='" + shift + "' group by OPERATION order by ROW;"
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
    
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/GetWip", error);
    }
});
app.post('/Production/Payroll_Search/Skip', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var file = req.body.file;
            var date = req.body.date;
            var QC = req.body.QC;
            if (QC == '') {
                QC = '999999';
            }
            console.log('skip update btn');
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("Update employee_scanticket set IS_FULL='100', QC='" + QC + "', MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "' where FILE='" + file + "';",
                    function (err, result, fields) {
                        connection.release();
                        if (err) throw err;
                        console.log('update_done');
                        res.send({ result: 'done' });
                        res.end();
                    });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Skip", error);
    }
});
app.post('/Production/Payroll_Search/Dismiss_error', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var file = req.body.fileName;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("Update bundleticket_error set MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "' where FILE='" + file + "';",
                    function (err, result, fields) {
                        connection.release();
                        if (err) throw err;
                        res.send({ result: 'done' });
                        res.end();
                    });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Dismiss_error", error);
    }
});
app.post('/Production/Payroll_Search/Bundle', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var file = req.body.file;
            var date = req.body.date;
            var bundle = req.body.bundle;
            console.log(file, date);
            var bundle_read;
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("SELECT TICKET, QC, EMPLOYEE FROM employee_scanticket where FILE='" + file + "' or TICKET like '" + bundle + "%';", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        bundle_read = result;
                        console.log(bundle_read[0].TICKET.substring(0, 6));
                        var bundle1 = bundle_read[0].TICKET.substring(0, 6);
                        var bundle = bundle1;
                        if (bundle_read.length > 2) {
                            var bundle2 = bundle_read[1].TICKET.substring(0, 6);
                            var bundle3 = bundle_read[2].TICKET.substring(0, 6);
                            if (bundle1 == bundle2 || bundle1 == bundle3)
                                bundle = bundle1;
                            if (bundle1 != bundle2 && bundle2 == bundle3)
                                bundle = bundle2;
                        }
                        console.log(bundle);
                        var QC = bundle_read[0].QC;
                        con4.getConnection(function (err, connection) {
                            if (err) {
                                connection.release();
                                throw err;
                            }
                            var sql = "";
                            if (date < "20200601")
                                sql = "SELECT bundleticket_active.TICKET "
                                    + " from bundleticket_active left join employee_scanticket "
                                    + " on bundleticket_active.TICKET=employee_scanticket.TICKET "
                                    + " where bundleticket_active.TICKET like '" + bundle + "%' and employee_scanticket.TICKET is null;";
                            else
                                sql = "SELECT TICKET from bundleticket_active where TICKET like '" + bundle + "%';"
                            connection.query(sql, function (err, result, fields) {
                                // connection.query(sql, function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    res.send({ bundle_read: bundle_read, bundle_full: result, QC: QC });
                                    res.end();
                                } else {
                                    res.send({ bundle_read: bundle_read, bundle_full: 'empty', QC: QC })
                                    res.end();
                                }
                            });
                        });
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Bundle", error); 
    }
});
app.post('/Production/Payroll_Search/BundleNew', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var file = req.body.file;
            var date = req.body.date;
            var bundle = req.body.bundle;
            console.log(file, date);
            var bundle_read;
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "SELECT Temp3.TICKET, scan.QC, scan.EMPLOYEE FROM employee_scanticket scan RIGHT JOIN "
                    + " (SELECT TICKET, active2.FILE FROM bundleticket_active active2 INNER JOIN (SELECT distinct active.FILE FROM bundleticket_active active "
                    + " INNER JOIN (SELECT TICKET FROM employee_scanticket where FILE = '" + file + "') AS Temp1 "
                    + " ON active.TICKET=Temp1.TICKET) AS Temp2 ON active2.`FILE`=Temp2.FILE) AS Temp3 ON Temp3.TICKET=scan.TICKET;"
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0 && result.length < 20) {
                        res.send(result);
                        res.end();
                        // bundle_read=result;
                        // console.log(bundle_read[0].TICKET.substring(0,6));
                        // var bundle1=bundle_read[0].TICKET.substring(0,6);
                        // ticket=bundle_read[0].TICKET;
                        // var bundle=bundle1;
                        // if (bundle_read.length>2){
                        //     var bundle2=bundle_read[1].TICKET.substring(0,6);
                        //     var bundle3=bundle_read[2].TICKET.substring(0,6);
                        //     if (bundle1==bundle2||bundle1==bundle3){
                        //         bundle=bundle1;
                        //         ticket=bundle_read[1].TICKET;
                        //     }
                        //     if (bundle1!=bundle2&&bundle2==bundle3){
                        //         bundle=bundle2;
                        //         ticket=bundle_read[2].TICKET;
                        //     }
                        // }
                        // console.log(bundle);
                        // var QC=bundle_read[0].QC;
                        // con4.getConnection(function(err, connection){
                        //     if (err) {
                        //         connection.release();
                        //         throw err;
                        //     }
                        //     // var sql="";
                        //     // if (date<"20200601")
                        //     sql="SELECT TICKET FROM (SELECT Temp2.TICKET, scan.FILE FROM employee_scanticket scan RIGHT JOIN "
                        //         +" (SELECT TICKET FROM  bundleticket_active active INNER JOIN "
                        //         +" (SELECT FILE FROM bundleticket_active WHERE TICKET='"+ticket+"') AS Temp1 ON active.`FILE`=Temp1.FILE) AS Temp2 "
                        //         +" ON scan.TICKET=Temp2.TICKET) AS Temp3 WHERE FILE IS NULL;";
                        //     // else
                        //     // sql="SELECT TICKET from bundleticket_active where TICKET like '"+bundle+"%';"
                        //     connection.query(sql, function (err, result, fields) {
                        //     // connection.query(sql, function (err, result, fields) {
                        //         connection.release();
                        //         if (err) throw err;
                        //         if (result.length>0) {
                        //             res.send({bundle_read:bundle_read, bundle_full:result, QC:QC});
                        //             res.end();
                        //         } else {
                        //             res.send({bundle_read:bundle_read, bundle_full:'empty', QC:QC})
                        //             res.end();
                        //         }
                        //     });
                        // });
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/BundleNew", error); 
    }
});
app.post('/Production/Payroll_Search/BundleSearch', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var bundle = req.body.bundle;
            console.log(bundle);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("SELECT TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, EARNED_HOURS, WORK_LOT, FILE, MODIFIED, QC FROM employee_scanticket where TICKET like '" + bundle + "%';", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        // console.log(result);
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/BundleSearch", error); 
    }
});
app.post('/Production/Payroll_Search/ID', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var id = req.body.id;
            var date = req.body.date;
            var datefrom = req.body.datefrom;
            console.log(date, datefrom);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "SELECT BUNDLE, OPERATION_CODE, EARNED_HOURS, UNITS, WORK_LOT, FILE FROM"
                    + " employee_scanticket where EMPLOYEE='" + id + "' and DATE<='" + date + "' and DATE>='" + datefrom + "'"
                    + " union "
                    + " select TOTAL_DZ as BUNDLE, MOVER as OPERATION_CODE, EARNED_HOURS*TOTAL_DZ*60 as EARNED_HOURS, TOTAL_DZ as UNITS, TOTAL_DZ as WORK_LOT, TOTAL_DZ as FILE"
                    + " from employee_mover where EMPLOYEE like '%" + id + "' and DATE<='" + date + "' and DATE>='" + datefrom + "'"
                    + " union "
                    + " select SUM(DzCase) as BUNDEL, CONCAT('MOVER',ZoneMover) as OPERATION_CODE, SUM(DzCase)*SAH*60 as EARNED_HOURS, SUM(DzCase) as UNITS, SUM(DzCase) as WORK_LOT, SUM(DzCase) as FILE"
                    + " from erpsystem.data_finishedgoodssewing inner join erpsystem.setup_sahmover"
                    + " on erpsystem.data_finishedgoodssewing.ZoneMover=erpsystem.setup_sahmover.Area "
                    + " where IDEmployees like '%" + id + "' and DATE<=DATE_FORMAT('" + date + "','%Y-%m-%d') and DATE>=DATE_FORMAT('" + datefrom + "','%Y-%m-%d') group by ZoneMover;"
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/ID", error); 
    }
});
app.post('/Production/Payroll_Search/Ticket', function (req, res) {
    try {
        var ticket = req.body.ticket;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("SELECT EMPLOYEE, DATE, FILE FROM"
                + " employee_scanticket where TICKET='" + ticket + "';", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
        });
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Ticket", error);
    }
});
app.post('/Production/Payroll_Search/Worklot', function (req, res) {
    try {
        var worklot = req.body.worklot;
        con4.getConnection(function (err, connection) {
            if (err) {
                connection.release();
                throw err;
            }
            sql = "SELECT bundleticket_active.TICKET, bundleticket_active.CREATE_DATE, bundleticket_active.OPERATION_CODE, "
                + " bundleticket_active.EARNED_HOURS, bundleticket_active.UNITS, bundleticket_active.FILE, employee_scanticket.DATE, employee_scanticket.EMPLOYEE "
                + " FROM bundleticket_active left join employee_scanticket on bundleticket_active.TICKET=employee_scanticket.TICKET "
                + " where bundleticket_active.WORK_LOT='" + worklot + "' and bundleticket_active.TICKET not like '%0109' and bundleticket_active.TICKET not like '%0110' and bundleticket_active.TICKET not like '%0112';";
            // connection.query("SELECT BUNDLE, CREATE_DATE, OPERATION_CODE, EARNED_HOURS, UNITS, FILE FROM bundleticket_active"
            // +" where WORK_LOT='"+worklot+"';", function (err, result, fields) {
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    var data = { result: 'empty' };
                    res.send(data);
                    res.end();
                }
            });
        });
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Worklot", error);
    }
});
app.post('/Production/Payroll_Search/WorklotSummary', function (req, res) {
    try {
        var worklot = req.body.worklot;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select LEFT(Temp1.TICKET, 6) as BUNDLE, FILE, COUNT(Temp1.TICKET) as ISSUE, COUNT(Temp2.TICKET) as EARN, COUNT(Temp3.TICKET) as IA, COUNT(Temp1.TICKET)-COUNT(Temp2.TICKET)-COUNT(Temp3.TICKET) as NOT_EARN from "
                + " (select TICKET, FILE from bundleticket_active where work_lot='" + worklot + "' and FILE!='0') as Temp1 "
                + " left join "
                + " (select TICKET from employee_scanticket where work_lot='" + worklot + "') as Temp2 on Temp1.TICKET=Temp2.TICKET "
                + " left join "
                + " (select TICKET from bundleticket_deactive where work_lot='" + worklot + "') as Temp3 on Temp1.TICKET=Temp3.TICKET "
                + " group by Temp1.FILE;";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    var data = { result: 'empty' };
                    res.send(data);
                    res.end();
                }
            });
        });
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/WorklotSummary", error);
    }
});
app.post('/Production/Payroll_Search/Alert', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var date = req.body.date;
            var datefrom = req.body.datefrom;
            var groupName = req.body.group;
            groupF = groupName.substring(0, 3);
            groupT = groupName.substring(4, 7);
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "SELECT TICKET, OLD_EMPLOYEE, OLD_FILE, NEW_EMPLOYEE, NEW_FILE, STATUS FROM bundleticket_alert WHERE NEW_FILE like '" + groupName + "%' and OLD_TimeUpdate>='" + datefrom + " 00:00:00' and OLD_TimeUpdate<='" + date + " 23:59:59' "
                    + " AND NEW_EMPLOYEE!=OLD_EMPLOYEE and OLD_FILE != NEW_FILE and OLD_TimeUpdate != New_TIMEUPDATE and (STATUS='Y' or STATUS='N') order by status desc, OLD_FILE;"
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Alert", error);
    }
});
app.post('/Production/Payroll_Search/Alert_Update_Status', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var ticket = req.body.ticket;
            var status = req.body.status;
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "update bundleticket_alert set STATUS='" + status + "' WHERE Ticket='" + ticket + "';"
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    res.send({ result: 'done' });
                    res.end()
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Alert_Update_Status", error);
    }
});
app.post('/Production/Payroll_Search/Update_Date_Scan1', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var date = req.body.date;
            // console.log(date, req.body.file_x);
            var file_name_list = req.body.file_x.split(';');
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                for (var i = 0; i < file_name_list.length; i++) {
                    file = file_name_list[i];
                    console.log(date, file)
                    sql = "update employee_scanticket set DATE='" + date + "' WHERE FILE='" + file + "';"
                    connection.query(sql, function (err, result, fields) {
                        if (err) throw err;
                    });
                }
                connection.release();
                res.send({ result: 'done' });
                res.end();
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Update_Date_Scan1", error);
    }
});
app.post('/Production/Payroll_Search/Sup_Release', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var asslot = req.body.asslot;
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "select * from supervisor_release_bundle where work_lot='" + asslot + "';";
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Sup_Release", error);
    }
});
app.post('/Production/Payroll_Search/Sup_Release_Submit', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var worklot = req.body.worklot;
            var quantity = req.body.quantity;
            var note = req.body.note;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            con4.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                sql = "insert into supervisor_release_bundle (WORK_LOT, TIME_RELEASE, QTY_ISSUE, USER, NOTE) values ('" + worklot + "', '" + timeUpdate + "', '" + quantity + "', '" + req.user.username + "', '" + note + "');";
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
                });
            });
        } else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Production/Payroll_Search/Sup_Release_Submit", error);
    }
});
app.get("/Production/LineBalancing", function (req, res) {
    res.render("Production/LineBalancing");
});
app.get("/Production/OffStandard", function (req, res) {
    var group_list;
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("SELECT distinct NameGroup as Line FROM setup_location where Location like 'Line%';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            group_list = result;
            if (req.isAuthenticated()) {
                res.render("Production/OffStandard", { group_list: group_list });
            }
            else {
                res.render("login", { msg: "" });
            }
        });
    });
});
app.post('/Production/GetOffStandardInfo', function (req, res) {
    if (req.isAuthenticated()) {
        empID = req.body.ID;
        week = req.body.week;
        date = req.body.date;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT e.ID, e.WC, e.Operation1, e.Efficiency1, e.Operation2, e.Efficiency2, e.Operation3, e.Efficiency3, "
                + " e.CODE, o.StartTime from "
                + " (SELECT * FROM linebalancing.employee_offstandard_register WHERE ID='" + empID + "' AND WeekUpdate='" + week + "') e "
                + " LEFT JOIN (SELECT * from linebalancing.operation_offstandard_tracking  WHERE ID='" + empID + "' "
                + " AND DateUpdate='" + date + " 00:00:00' AND FinishTime IS NULL) o ON e.ID=o.ID;"
            // sql="select * from employee_offstandard_register where ID='"+ID+"' and WeekUpdate='"+week+"';";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Production/GetOffStandardCode', function (req, res) {
    if (req.isAuthenticated()) {
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select CONCAT(Code,' (',Description,')') OffCode from linebalancing.setup_operation_standard_code;";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Production/GetStyleDetail1', function (req, res) {
    if (req.isAuthenticated()) {
        week = req.body.week;
        groupName = req.body.group;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT DISTINCT style FROM linebalancing.web_data_ie_balance WHERE WEEK='" + week + "' AND groupcbc='" + groupName + "';";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Production/GetOffStandardTracking', function (req, res) {
    if (req.isAuthenticated()) {
        date = req.body.date;
        wc = req.body.wc;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = `select * 
            from linebalancing.operation_offstandard_tracking 
            where (
				('${wc}' IS NULL OR '${wc}' = '' )
				OR WC LIKE CONCAT('%', '${wc}', '%')
			) and SUBSTRING(DateUpdate, 1, 10)='${date}' ORDER BY ID DESC`;
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login", { msg: "" });
    }
});
app.post('/Production/IsExistedOffStandardTracking', function (req, res) {
    if (req.isAuthenticated()) {
        date = req.body.date;
        empID = req.body.empID;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select * from linebalancing.operation_offstandard_tracking where ID='" + empID + "' and DateUpdate='" + date + "' and FinishTime is null;";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});

const round = (x, n = 2) => {
    const precision = Math.pow(10, n)
    return Math.round((x + Number.EPSILON) * precision) / precision;
}
app.post('/Production/InsertOffStandardTracking', function (req, res) {
    if (req.isAuthenticated()) {
        workerID = req.body.workerID;
        name = req.body.name;
        code = req.body.code;
        wc = req.body.wc;
        op1 = req.body.op1;
        op2 = req.body.op2;
        note = req.body.note;
        finishTime = req.body.finishTime;
        currentDate = req.body.currenDate;

        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        userUpdate = req.user.username;
        startTime = timeUpdate;
        dateUpdate = timeUpdate.split(' ')[0];
        hh = parseInt(timeUpdate.split(' ')[1].split(':')[0]);
        mm = parseInt(timeUpdate.split(' ')[1].split(':')[1]);
        // if (hh == 13 && mm > 45 && mm < 59) startTime = dateUpdate + ' 14:00:00';
        startTime = currentDate + ' ' + req.body.startTime;
        finishTime = finishTime == "" ? "" : currentDate + " " + finishTime;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = `Insert into linebalancing.operation_offstandard_tracking (WorkerID, Name, Code, WC, Operation1, Operation2, StartTime, UserUpdate, DateUpdate, Note) 
                values('${workerID}', '${name}', '${code}', '${wc}', '${op1}', '${op2}', '${startTime}', '${userUpdate}','${timeUpdate}', '${note}')`;

            if (finishTime != "") {
                let spanTime = round((Math.abs(new Date(finishTime) - new Date(startTime)) / 1000) / 3600);
                sql = `Insert into linebalancing.operation_offstandard_tracking (WorkerID, Name, Code, WC, Operation1, Operation2, StartTime, FinishTime, SpanTime, UserUpdate, DateUpdate, Note) 
                values('${workerID}', '${name}', '${code}', '${wc}', '${op1}', '${op2}', '${startTime}', '${finishTime}', '${spanTime}', '${userUpdate}','${timeUpdate}', '${note}')`;
            }
            console.log(sql);
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login", { msg: "" });
    }
});
app.post('/Production/CloseOffStandardTracking', function (req, res) {
    if (req.isAuthenticated()) {
        id = req.body.id;
        finishTime = req.body.finishTime;
        startTime = req.body.startTime;
        tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            // sql="update linebalancing.operation_offstandard_tracking set FinishTime='"+finishTime+"', SpanTime=ROUND(TIME_TO_SEC(TIMEDIFF('"+finishTime+"',StartTime))/3600,2) where ID='"+empID+"' and StartTime='"+startTime+"';"
            sql = "update linebalancing.operation_offstandard_tracking set "
                + " FinishTime= IF(StartTime<=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 13:45:00'), now(), CONCAT(CURDATE(),' 13:45:00')), "
                + " IF(StartTime<=CONCAT(CURDATE(),' 22:00:00') AND StartTime>=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 22:00:00'), now(), CONCAT(CURDATE(),' 22:00:00')), NOW())), "
                + " SpanTime=IF(ROUND(TIME_TO_SEC(TIMEDIFF(IF(StartTime<=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 13:45:00'), now(), CONCAT(CURDATE(),' 13:45:00')), "
                + " IF(StartTime<=CONCAT(CURDATE(),' 22:00:00') AND StartTime>=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 22:00:00'), now(), CONCAT(CURDATE(),' 22:00:00')), NOW())),StartTime))/3600,2)>7.5, 7.5, "
                + " ROUND(TIME_TO_SEC(TIMEDIFF(IF(StartTime<=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 13:45:00'), now(), CONCAT(CURDATE(),' 13:45:00')), "
                + " IF(StartTime<=CONCAT(CURDATE(),' 22:00:00') AND StartTime>=CONCAT(CURDATE(),' 14:00:00'), IF(now()<=CONCAT(CURDATE(),' 22:00:00'), now(), CONCAT(CURDATE(),' 22:00:00')), NOW())),StartTime))/3600,2))  "
                + ", DateUpdate='" + timeUpdate + "'"
                + " where ID=" + id + ";"

            if (finishTime != '') {
                ftTemp = (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString().slice(0, -1).substring(0, 10) + " " + finishTime;
                stTemp = (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString().slice(0, -1).substring(0, 10) + " " + startTime;
                let spanTime = round((Math.abs(new Date(ftTemp) - new Date(stTemp)) / 1000) / 3600);
                sql = `update linebalancing.operation_offstandard_tracking set 
                FinishTime = '${ftTemp}', SpanTime = '${spanTime}', DateUpdate = '${timeUpdate}'
                where ID = ${id};`
            }
            console.log(sql);
            connection.query(sql, function (err, result, fields) {
                // connection.release();
                if (err) throw err;
                sql1 = "select * from linebalancing.operation_offstandard_tracking where ID=" + id;
                connection.query(sql1, function (err, result2, fields) {
                    connection.release();
                    if (err) throw err;
                    res.send(result2);
                    res.end();
                })
            });
        });
    } else {
        res.render("login", { msg: "" });
    }
});
app.post('/Production/GetOperationByEmployee7000', function (req, res) {
    if (req.isAuthenticated()) {
        empID = req.body.empID;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select t1.OPERATION, t1.EFF ACTUAL, o.EFFICIENCY GOAL, r.TARGET  from "
                + " (select t.OPERATION, max(EFF) EFF from linebalancing.employee_eff_data_ie_setup_temp t "
                + " where t.EMPLOYEE='" + empID + "' and t.OPERATION!='ie_assign' group by t.OPERATION) t1 "
                + " left join linebalancing.setup_operation_7000_target o on t1.OPERATION=o.OPERATION "
                + " left join (select * from linebalancing.data_operation_7000_register where EMPLOYEE='" + empID + "' "
                + " and MONTH(TimeUpdate)=MONTH(CURDATE()) and YEAR(TimeUpdate)=Year(CURDATE())) r on r.OPERATION=t1.OPERATION;";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Production/AddOperationByEmployee7000', function (req, res) {
    if (req.isAuthenticated()) {
        empID = req.body.empID;
        operation = req.body.operation;
        actual = req.body.actual;
        target = req.body.target;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "replace into linebalancing.data_operation_7000_register (ID, EMPLOYEE, OPERATION, ACTUAL, TARGET, TimeUpdate, User) "
                + " values (CONCAT('" + empID + operation + "',MONTH(NOW()), YEAR(NOW())), '" + empID + "', '" + operation + "', '" + actual + "', '" + target + "', NOW(),'" + req.user.username + "');";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Production/DeleteOperationByEmployee7000', function (req, res) {
    if (req.isAuthenticated()) {
        empID = req.body.empID;
        operation = req.body.operation;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "delete from linebalancing.data_operation_7000_register where ID=CONCAT('" + empID + operation + "',MONTH(NOW()), YEAR(NOW()));";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.get("/Production/MixSolve", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Production/MixSolve");
    } else {
        res.render("login");
    }
});
//====================AUTO KANBAN===============================
app.get("/Production/AutoKanban", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Production/AutoKanban");
    } else {
        res.render("login");
    }
});
app.get("/Production/AutoKanban1", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Production/AutoKanban1");
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/GetOperations", function (req, res) {
    if (req.isAuthenticated()) {
        worklot = req.body.worklot;
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = 'SELECT scan.OPERATION FROM bundleticket_active scan '
                + ' INNER JOIN operation_sequence sq ON scan.OPERATION_CODE=sq.OPERATION_CODE '
                + ' WHERE WORK_LOT="' + worklot + '" AND sq.MFG=scan.STYLE and scan.OPERATION not like "PACKING" '
                + ' GROUP BY OPERATION ORDER BY SEQUENCE;';
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/GetAsslotInfor", async function (req, res) {
    if (req.isAuthenticated()) {
        var asslot = req.body.asslot;
        var shift = req.body.shift;
        var span = req.body.span;
        var operation = req.body.operation;
        var group_special = req.body.group_special;
        var options = {
            mode: 'json',
            pythonPath: 'python',
            scriptPath: './public/Python/Production/AutoKanban',
            pythonOptions: ['-u'], // get print results in real-time
            args: [asslot, shift, span, operation, group_special]
        };
        console.log('Phat tem: ', asslot,);
        let shell = new PythonShell('GetAsslotInfo.py', options);
        shell.on('message', function (message) {
            res.setHeader("Content-Type", "application/json");
            console.log(message);
            res.send(message);
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.get("/Production/Reports", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Production/Reports");
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/GetEmployeeInfo", function (req, res) {
    if (req.isAuthenticated()) {
        ID = req.body.ID;
        style_detail = req.body.style_detail;
        operation = req.body.operation;
        con1.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            // connection.query("SELECT NAME, ROUND(AVG(EFF),2) as EFF FROM employee_eff_data_ie_setup_temp where EMPLOYEE='"+ID+"' and OPERATION='"+operation+"' and STYLE_DETAIL='"+style_detail+"';", function (err, result, fields) {
            sql = "SELECT emp.ID, emp.NAME, emp.LINE, ROUND(AVG(EFF),2) as EFF FROM (SELECT * from employee_eff_data_ie_setup_temp "
                + " WHERE EMPLOYEE='" + ID + "' and OPERATION='" + operation + "' and STYLE_DETAIL='" + style_detail + "') eff "
                + " right JOIN (SELECT ID, RIGHT(ID, 5) as EMPLOYEE, NAME, LINE from erpsystem.setup_emplist WHERE RIGHT(ID, 5)='" + ID + "') emp "
                + " ON emp.EMPLOYEE=eff.EMPLOYEE WHERE emp.EMPLOYEE='" + ID + "';";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/SubmitAsslotHistory", function (req, res) {
    if (req.isAuthenticated()) {
        data = req.body.data;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        date = timeUpdate.substring(0, 11);
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < data.length; i++) {
                asslot = data[i].asslot;
                worklot = data[i].worklot;
                shift = data[i].shift;
                spantime = data[i].spantime;
                ID = data[i].ID;
                work_hrs = data[i].work_hrs;
                color = data[i].color;
                output = data[i].output;
                if (output == '') output = '0';
                Key_ID = asslot + spantime + ID + color + date + shift;
                sql1 = "replace into asslot_control (ID, ASS_LOT, WORK_LOT, SPAN_TIME, SHIFT, EMPLOYEE, WORK_HRS, COLOR, OUTPUT, TimeUpdate, UserUpdate) "
                    + " values('" + Key_ID + "', '" + asslot + "', '" + worklot + "', '" + spantime + "', '" + shift + "', '" + ID + "', '" + work_hrs + "', '" + color + "', '" + output + "', '" + timeUpdate + "', '" + req.user.username + "');";
                connection.query(sql1, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/DeleteAsslotHistory", function (req, res) {
    asslot = req.body.asslot;
    shift = req.body.shift;
    spantime = req.body.spantime;
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "delete from asslot_control where ASS_LOT='" + asslot + "' and SHIFT='" + shift + "' and SPAN_TIME='" + spantime + "';";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send('done');
            res.end();
        });
    });
});
app.post("/Production/GetShiftTime", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "select StartTime, FinishTime, Shift, Note, Week from operation_schedule where DATE='" + date + "';";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post("/Production/GetGroup", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    get_date_infor(date, function (result) {
        week = result[0].Week;
        nextWeek = week + 1
        lastWeek = week - 1
        con1.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT GroupName AS GROUP_IE, NameGroup AS GROUP_PLAN, p.PLAN FROM (select distinct GroupName from web_ie_location) w LEFT JOIN "
                + " (select NameGroup, PLAN from erpsystem.setup_plansewing where Week='" + lastWeek + "' or Week='" + week + "' or Week='" + nextWeek + "' group by NameGroup) p ON w.groupName=p.NameGroup GROUP BY groupName;"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    });
});
app.post("/Production/GetGroupKanban", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    get_date_infor(date, function (result) {
        week = result[0].Week;
        nextWeek = week + 1
        lastWeek = week - 1
        con2.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select t1.NAMEGROUP, HQAS, PLAN, ASS_STATUS, ASS_CALL, ASS_SEND, ASS_RECEIVE, ASS_PENDING from "
                + " (select NAMEGROUP, PLAN from erpsystem.setup_plansewing where Week='" + lastWeek + "' or Week='" + week + "' or Week='" + nextWeek + "' group by NameGroup) t1 "
                + " left join (select GROUP_CONCAT(HQAS SEPARATOR'+') HQAS, NAMEGROUP, ASS_STATUS, ASS_CALL, ASS_SEND, ASS_RECEIVE, ASS_PENDING "
                + " from pr2k.operation_kanban where ASS_STATUS!='DONE' group by NameGroup order by FIELD(ASS_STATUS, 'NOTIFY','CALL','SEND','PENDING','SUSPEND')) t2 on t1.NAMEGROUP=t2.NAMEGROUP order by t1.NAMEGROUP;"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send(result);
                res.end();
            });
        });
    });
});
app.post("/Production/AutoKanban/GetNextAsslot", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    asslot = req.body.asslot;
    // groupName=req.body.groupName;
    get_date_infor(date, function (result) {
        week = result[0].Week;
        nextWeek = week + 1
        preWeek = week - 1;
        con2.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select CutLot, HQAS, LotAnet, LotTotal, RIGHT(COLOR,3) as COLOR, SELLSTYLE, SIZE, TOTAL, pl.NAMEGROUP from setup_plansewing pl inner join "
                + " (select NameGroup from setup_plansewing where LotTotal='" + asslot + "' group by NameGroup) t1 "
                + " on pl.NameGroup=t1.NameGroup where (Week='" + preWeek + "' or Week='" + week + "' or Week='" + nextWeek + "');"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                // console.log(result);
                res.send(result);
                res.end();
            });
        });
    });
});
app.post("/Production/AutoKanban/GetNextAsslot6", function (req, res) {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
    currHrs = parseInt(timeUpdate.substring(11, 13));
    year = timeUpdate.substring(0, 4);
    month = timeUpdate.substring(5, 7);
    day = timeUpdate.substring(8, 10);
    date = year + month + day;
    asslot6 = req.body.asslot6;
    // groupName=req.body.groupName;
    get_date_infor(date, function (result) {
        week = parseInt(result[0].Week);
        nextWeek = week + 1
        preWeek = week - 1;
        con2.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select Plan from erpsystem.setup_plansewing where HQAS='" + asslot6 + "' or CUTLOT='" + asslot6 + "';"
            connection.query(sql, function (err, result, fields) {
                if (err) throw err;
                if (result.length == 0) {
                    connection.release();
                    res.send('notfound');
                    res.end();
                } else {
                    if (result[0].Plan == 'PBIE') {
                        sql1 = "select CutLot, HQAS, LotAnet, LotTotal, RIGHT(COLOR,3) as COLOR, SELLSTYLE, SIZE, TOTAL, pl.NAMEGROUP from setup_plansewing pl inner join "
                            + " (select NameGroup from setup_plansewing where (Plan='PBIE') group by NameGroup) t1 "
                            + " on pl.NameGroup=t1.NameGroup where (Week='" + preWeek.toString() + "' or Week='" + week.toString() + "' or Week='" + nextWeek.toString() + "');"
                        console.log(sql);
                        connection.query(sql1, function (err, result, fields) {
                            connection.release();
                            if (err) throw err;
                            // console.log(result);
                            res.send(result);
                            res.end();
                        });
                    } else {
                        sql1 = "select CutLot, HQAS, LotAnet, LotTotal, RIGHT(COLOR,3) as COLOR, SELLSTYLE, SIZE, TOTAL, pl.NAMEGROUP from setup_plansewing pl inner join "
                            + " (select NameGroup from setup_plansewing where (HQAS='" + asslot6 + "' or CutLot='" + asslot6 + "') group by NameGroup) t1 "
                            + " on pl.NameGroup=t1.NameGroup where (Week='" + preWeek.toString() + "' or Week='" + week.toString() + "' or Week='" + nextWeek.toString() + "');"
                        console.log(sql);
                        connection.query(sql1, function (err, result, fields) {
                            connection.release();
                            if (err) throw err;
                            // console.log(result);
                            res.send(result);
                            res.end();
                        });
                    }
                }
            });
        });
    });
});
app.post("/Production/AutoKanban/GetKanbanAsslot", function (req, res) {
    groupName = req.body.group;
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "select p.CutLot, p.HQAS, p.LotAnet, p.LotTotal, RIGHT(p.Color,3) as COLOR, p.SELLSTYLE, p.SIZE, p.TOTAL, p.NAMEGROUP from "
            + " (select ASS_LOT, ASS_STATUS from pr2k.operation_kanban where NAMEGROUP='" + groupName + "' and (ASS_STATUS!='DONE' and ASS_STATUS!='PENDING') order by TimeUpdate desc) t1 "
            + " inner join erpsystem.setup_plansewing p on t1.ASS_LOT=p.LotTotal;"
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post("/Production/AutoKanban/GetKanbanAsslot6", function (req, res) {
    groupName = req.body.group;
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "select p.CutLot, p.HQAS, p.LotAnet, p.LotTotal, RIGHT(p.Color,3) as COLOR, p.SELLSTYLE, p.SIZE, p.TOTAL, p.NAMEGROUP from "
            + " (select HQAS, ASS_STATUS from pr2k.operation_kanban where NAMEGROUP='" + groupName + "' and (ASS_STATUS!='DONE') order by TimeUpdate desc) t1 "
            + " inner join erpsystem.setup_plansewing p on t1.HQAS=p.HQAS;"
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post("/Production/AutoKanban/NotifyAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        next_asslot_str = req.body.next_asslot;
        next_asslot_list = next_asslot_str.split(';');
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            result = '';
            id = -1;
            for (var i = 0; i < next_asslot_list.length; i++) {
                next_asslot = next_asslot_list[i];
                console.log('next_asslolt' + next_asslot);
                sql = "select * from operation_kanban where ASS_LOT='" + next_asslot + "' and TimeUpdate>(CURDATE()-INTERVAl 30 DAY);";
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    if (result.length > 0) {
                        result = 'existed';
                        id = i;
                    }
                });
                sql = "replace into operation_kanban (ASS_LOT, NAMEGROUP, ASS_STATUS, ASS_NOTIFY, TimeUpdate, User) "
                    + " values ('" + next_asslot + "','" + curr_group + "','NOTIFY','" + timeUpdate + "','" + timeUpdate + "', '" + req.user.username + "');";
                console.log(sql)
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    result = 'done';
                });
            }
            connection.release();
            res.send({ result: result, id: id });
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/NotifyAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        next_asslot_str = req.body.next_asslot;
        next_asslot_list = next_asslot_str.split(';');
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            result = '';
            id = -1;
            for (var i = 0; i < next_asslot_list.length; i++) {
                next_asslot = next_asslot_list[i];
                console.log('next_asslolt' + next_asslot);
                sql = "select * from operation_kanban where HQAS='" + next_asslot + "' and TimeUpdate>(CURDATE()-INTERVAl 30 DAY);";
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    if (result.length > 0) {
                        result = 'existed';
                        id = i;
                    }
                });
                asslot = '98' + next_asslot + '01';
                sql = "replace into operation_kanban (ASS_LOT, HQAS, NAMEGROUP, ASS_STATUS, ASS_NOTIFY, TimeUpdate, User) "
                    + " values ('" + asslot + "', '" + next_asslot + "','" + curr_group + "','NOTIFY','" + timeUpdate + "','" + timeUpdate + "', '" + req.user.username + "');";
                console.log(sql)
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    result = 'done';
                });
            }
            connection.release();
            res.send({ result: result, id: id });
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/CancelAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            result = '';
            sql = "delete from operation_kanban where NAMEGROUP='" + curr_group + "' and ASS_STATUS='NOTIFY';";
            console.log(sql);
            connection.query(sql, function (err, result, fields) {
                if (err) throw err;
                connection.release();
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/NotifyAsslot", function (req, res) {
    if (req.isAuthenticated()) {
        next_asslot = req.body.next_asslot;
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "select * from operation_kanban where ASS_LOT='" + next_asslot + "' and TimeUpdate>(CURDATE()-INTERVAl 30 DAY);";
            connection.query(sql, function (err, result, fields) {
                if (err) throw err;
                if (result.length > 0) {
                    res.send('existed');
                    res.end();
                } else {
                    sql = "replace into operation_kanban (ASS_LOT, NAMEGROUP, ASS_STATUS, ASS_NOTIFY, TimeUpdate, User) "
                        + " values ('" + next_asslot + "','" + curr_group + "','NOTIFY','" + timeUpdate + "','" + timeUpdate + "', '" + req.user.username + "');";
                    console.log(sql)
                    connection.query(sql, function (err, result, fields) {
                        if (err) throw err;
                        connection.release();
                        res.send('done');
                        res.end();
                    });
                }
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/CallAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            // sql="insert ignore into operation_kanban (ASS_LOT, NAMEGROUP, ASS_STATUS, ASS_CALL, TimeUpdate, User) "
            //     +" values ('"+next_asslot+"','"+curr_group+"','CALL','"+timeUpdate+"','"+timeUpdate+"', '"+req.user.username+"');";
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i]
                sql = "update operation_kanban set ASS_STATUS='CALL', ASS_CALL='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/CallAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            // sql="insert ignore into operation_kanban (ASS_LOT, NAMEGROUP, ASS_STATUS, ASS_CALL, TimeUpdate, User) "
            //     +" values ('"+next_asslot+"','"+curr_group+"','CALL','"+timeUpdate+"','"+timeUpdate+"', '"+req.user.username+"');";
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i]
                sql = "update operation_kanban set ASS_STATUS='CALL', ASS_CALL='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/CallAsslot", function (req, res) {
    if (req.isAuthenticated()) {
        asslot = req.body.asslot;
        curr_group = req.body.curr_group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            // sql="insert ignore into operation_kanban (ASS_LOT, NAMEGROUP, ASS_STATUS, ASS_CALL, TimeUpdate, User) "
            //     +" values ('"+next_asslot+"','"+curr_group+"','CALL','"+timeUpdate+"','"+timeUpdate+"', '"+req.user.username+"');";
            sql = "update operation_kanban set ASS_STATUS='CALL', ASS_CALL='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/SendAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                console.log('send_asslolt' + asslot);
                sql = "update operation_kanban set ASS_STATUS='SEND', ASS_SEND='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                console.log(sql)
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/SendAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                sql = "update operation_kanban set ASS_STATUS='SEND', ASS_SEND='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/ReceiveAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                sql = "update operation_kanban set ASS_STATUS='RECEIVE', ASS_RECEIVE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/ReceiveAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                sql = "update operation_kanban set ASS_STATUS='RECEIVE', ASS_RECEIVE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/ReceiveAsslot", function (req, res) {
    if (req.isAuthenticated()) {
        asslot = req.body.asslot;
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "update operation_kanban set ASS_STATUS='RECEIVE', ASS_RECEIVE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/ReceiveAsslot6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot = req.body.asslot;
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "update operation_kanban set ASS_STATUS='RECEIVE', ASS_RECEIVE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send('done');
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/SuppliesAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                console.log('supply_asslolt' + asslot);
                sql = "update operation_kanban set ASS_STATUS='SUPPLIES', ASS_SUPPLIES='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/SuppliesAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                console.log('supply_asslolt' + asslot);
                sql = "update operation_kanban set ASS_STATUS='SUPPLIES', ASS_SUPPLIES='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/PendingAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                console.log('pending_asslolt' + asslot);
                sql = "update operation_kanban set ASS_STATUS='PENDING', ASS_PENDING='" + timeUpdate + "', ASS_DONE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/PendingAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i];
                console.log('pending_asslolt' + asslot);
                sql = "update operation_kanban set ASS_STATUS='PENDING', ASS_PENDING='" + timeUpdate + "', ASS_DONE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/DoneAsslots", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i]
                sql = "update operation_kanban set ASS_STATUS='DONE', ASS_SUPPLIES='" + timeUpdate + "', ASS_DONE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where ASS_LOT='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/AutoKanban/DoneAsslots6", function (req, res) {
    if (req.isAuthenticated()) {
        asslot_list = req.body.asslot.split(';');
        groupName = req.body.group;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < asslot_list.length; i++) {
                asslot = asslot_list[i]
                sql = "update operation_kanban set ASS_STATUS='DONE', ASS_SUPPLIES='" + timeUpdate + "', ASS_DONE='" + timeUpdate + "', TimeUpdate='" + timeUpdate + "', User='" + req.user.username + "' where HQAS='" + asslot + "';"
                connection.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
            connection.release();
            res.send('done');
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Production/Report/CheckCutlot", function (req, res) {
    if (req.isAuthenticated()) {
        week = req.body.week;
        groupName = req.body.group;
        // var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        // var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        // var timeUpdate=localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT CUTLOT, LOTANET, LOTTOTAL, p.HQAS, LEFT(COLOR, 4) MFG, RIGHT(COLOR, 3) COLOR, SELLSTYLE, SIZE, TOTAL, c.TimeScan, k.ASS_STATUS "
                + " FROM erpsystem.setup_plansewing p "
                + " LEFT JOIN erpsystem.data_scancutpartcutting c ON p.CutLot=c.WorkLot "
                + " LEFT JOIN pr2k.operation_kanban k ON p.Hqas=k.HQAS "
                + " WHERE p.NameGroup='" + groupName + "' AND p.WEEK='" + week + "';"
            connection.query(sql, function (err, result, fields) {
                if (err) throw err;
                connection.release();
                res.send(result);
                res.end();
            });
        });
    } else {
        res.render("login");
    }
});
function get_kanban_infor(plant = 'PB', groupName = '000-000', callback) {
    con4.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        if (plant == 'PB' && groupName == '000-000') sql = "select se.NAMEGROUP, kb.ASS_LOT, kb.ASS_STATUS, kb.ASS_CALL, kb.ASS_SEND, kb.ASS_RECEIVE, kb.ASS_SUSPEND from operation_kanban kb "
            + " inner join erpsystem.setup_plansewing se on kb.ASS_LOT=se.LotAnet where STAtUS!='DONE' group by se.NameGroup;";
        else if (plant != 'PB' && groupName == '000-000') sql = "select se.NAMEGROUP, kb.ASS_LOT, kb.ASS_STATUS, kb.ASS_CALL, kb.ASS_SEND, kb.ASS_RECEIVE, kb.ASS_SUSPEND from operation_kanban kb "
            + " inner join erpsystem.setup_plansewing se on kb.ASS_LOT=se.LotAnet where STATUS!='DONE' and PLAN='" + plant + "' group by se.NameGroup;";
        else if (plant == 'PB' && groupName != '000-000') sql = "select se.NAMEGROUP, kb.ASS_LOT, kb.ASS_STATUS, kb.ASS_CALL, kb.ASS_SEND, kb.ASS_RECEIVE, kb.ASS_SUSPEND from operation_kanban kb "
            + " inner join erpsystem.setup_plansewing se on kb.ASS_LOT=se.LotAnet where STATUS!='DONE' and se.NameGroup='" + groupName + "' group by se.NameGroup;";
        else if (plant != 'PB' && groupName == '000-000') sql = "select se.NAMEGROUP, kb.ASS_LOT, kb.ASS_STATUS, kb.ASS_CALL, kb.ASS_SEND, kb.ASS_RECEIVE, kb.ASS_SUSPEND from operation_kanban kb "
            + " inner join erpsystem.setup_plansewing se on kb.ASS_LOT=se.LotAnet where STATUS!='DONE' and PLAN='" + plant + "' and se.NameGroup='" + groupName + "' group by se.NameGroup;";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            return callback(result);
        });
    });
}
//=====================================CUTTING=============================================
app.get("/Cutting/Cutting", function (req, res) {
    res.render("Cutting/Cutting");
});
app.get("/Cutting/PayrollCheck", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("Cutting/PayrollCheck");
    }
    else {
        res.render("login");
    }
});

app.post('/Cutting/Payroll_Search/GroupNew', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var groupName = req.body.group;
            var date = req.body.date;
            // var bundle=req.body.bundle;
            var year = date.substring(0, 4);
            var month = date.substring(4, 6);
            var day = date.substring(6, 8);
            var dateFull = day + '-' + month + '-' + year;
            console.log(dateFull);
            var image_list;
            con5.getConnection(function (err, connection) {
                if (err) throw err;
                sql = "SELECT Temp4.ISSUE_FILE, LEFT(Temp4.TICKET, 6) AS BUNDLE, max(QC) as QC, COUNT(Temp4.TICKET) AS ISSUE, COUNT(EMPLOYEE) AS SCAN, COUNT(deactive.TICKET) AS IASCAN, COUNT(Temp4.TICKET)-COUNT(EMPLOYEE)-COUNT(deactive.TICKET) AS IS_FULL, MAX(Temp4.FILE) as FILE, Temp4.TimeUpdate, TimeModified FROM "
                    + " (SELECT Temp3.FILE AS ISSUE_FILE, Temp3.TICKET, scan.QC, scan.EMPLOYEE, scan.FILE, scan.TimeUpdate, scan.TimeModified FROM employee_scanticket scan RIGHT JOIN "
                    + " (SELECT TICKET, active2.FILE FROM bundleticket_active active2 INNER JOIN (SELECT distinct active.FILE FROM bundleticket_active active "
                    + " INNER JOIN (SELECT TICKET FROM employee_scanticket where FILE LIKE '" + groupName + "_" + dateFull + "%') AS Temp1 "
                    + " ON active.TICKET=Temp1.TICKET) AS Temp2 ON active2.`FILE`=Temp2.FILE WHERE active2.FILE!='0') AS Temp3 ON Temp3.TICKET=scan.TICKET) AS Temp4  LEFT JOIN bundleticket_deactive deactive ON Temp4.TICKET=deactive.TICKET "
                    + " GROUP BY Temp4.ISSUE_FILE;"
                console.log(sql);
                connection.query(sql, function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        // console.log(result);
                        image_list = result;
                        var error_list;
                        con5.getConnection(function (err, connection) {
                            if (err) {
                                throw err;
                            }
                            // connection.query("SELECT FILE from bundleticket_error where DATE='"+date+"' and FILE like '"+group+"%';", function (err, result, fields) {
                            connection.query("SELECT FILE from bundleticket_error where FILE like '" + groupName + "_" + dateFull + "%' and MODIFIED IS NULL;", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                if (result.length > 0) {
                                    error_list = result;
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                } else {
                                    error_list = 'empty';
                                    res.send({ image_list: image_list, error_list: error_list });
                                    res.end();
                                }
                            });
                        });
                    } else {
                        res.send({ image_list: 'empty' });
                        res.end();
                    }
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Cutting/Payroll_Search/GroupNew", error);
    }
});
app.post("/Cutting/Payroll_Search/GroupMultipleOperations", function (req, res) {
    try {
        var groupName = req.body.group;
        var date = req.body.date;
        // console.log(group, date);
        con5.getConnection(function (err, connection) {
            if (err) {
                connection.release();
                throw err;
            }
            var sql = ("SELECT * FROM "
                + "(SELECT EMPLOYEE, COUNT(DISTINCT OPERATION_CODE) AS OP_CODE, COUNT(TICKET) AS TICKET, FILE, QC, SUM(IS_FULL) as SUM_FULL FROM employee_scanticket "
                + " WHERE DATE='" + date + "' AND FILE LIKE '" + groupName + "%'"
                + " GROUP BY EMPLOYEE, FILE ) AS TEMP "
                + " WHERE TEMP.OP_CODE>1 and SUM_FULL<200;");
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    } catch (error) {
        logHelper.writeLog("/Cutting/Payroll_Search/GroupMultipleOperations", error);
    }
});
app.post('/Cutting/Payroll_Search/Submit', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var bundle = req.body.bundle;
            var ID = req.body.ID;
            var QC = req.body.QC;
            var file = req.body.file;
            var date = req.body.date;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            console.log(ID, bundle, date, bundle.substring(0, 6), bundle.substring(6, 10), QC, timeUpdate, req.user.username, file);
            con5.getConnection(function (err, connection) {
                if (err) {
                    connection.release();
                    throw err;
                }
                connection.query("select EMPLOYEE from employee_scanticket where TICKET='" + bundle + "';", function (err, result, fields) {
                    if (err) throw err;
                    // console.log(result);
                    // res.setHeader("Content-Type", "application/json");
                    if (result.length == 0) {
                        console.log('insert ', ID);
                        connection.query("replace into employee_scanticket"
                            + " (TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, IRR, QC, FILE, IS_FULL, MODIFIED, TimeUpdate)"
                            + " values ('" + bundle + "', '" + ID + "', '" + date + "','" + bundle.substring(0, 6) + "', '" + bundle.substring(6, 10) + "','000','" + QC + "','" + file + "','100','" + req.user.username + "', '" + timeUpdate + "')", function (err, result, fields) {
                                connection.release();
                                if (err) throw err;
                                res.setHeader("Content-Type", "application/json");
                                res.send({ result: 'done' });
                                // next();
                                res.end();
                            });
                    } else {
                        console.log('update ', ID);
                        connection.query("update employee_scanticket set EMPLOYEE='" + ID + "', QC='" + QC + "', IS_FULL='100', MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "', FILE='" + file + "' where TICKET='" + bundle + "';", function (err, result, fields) {
                            connection.release();
                            if (err) throw err;
                            res.setHeader("Content-Type", "application/json");
                            res.send({ result: 'done' });
                            // next();
                            res.end();
                        });
                    }
    
                    // res.send({result:'done'});
                    // res.end();
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Cutting/Payroll_Search/Submit", error);
    }
});
app.post('/Cutting/Payroll_Search/Submit1', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var bundle = req.body.bundle;
            var ID = req.body.ID;
            var QC = req.body.QC;
            var file = req.body.file;
            var date = req.body.date;
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
            var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
            console.log(ID, bundle, date, bundle.substring(0, 6), bundle.substring(6, 10), QC, timeUpdate, req.user.username, file);
            con5.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("replace into employee_scanticket"
                    + " (TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, IRR, QC, FILE, IS_FULL, MODIFIED, TimeUpdate)"
                    + " values ('" + bundle + "', '" + ID + "', '" + date + "','" + bundle.substring(0, 6) + "', '" + bundle.substring(6, 10) + "','000','" + QC + "','" + file + "','100','" + req.user.username + "', '" + timeUpdate + "')", function (err, result, fields) {
                        connection.release();
                        if (err) throw err;
                        res.send({ result: 'done' });
                        res.end();
                    });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Cutting/Payroll_Search/Submit1", error);
    }
});
app.post('/Cutting/Payroll_Search/GetName', function (req, res) {
    try {
        if (req.isAuthenticated()) {
            var ID = req.body.ID;
            con2.getConnection(function (err, connection) {
                if (err) {
                    throw err;
                }
                connection.query("Select Name, ID, Line, Shift from setup_emplist where ID like '%" + ID + "' and Type='DR';", function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    if (result.length > 0) {
                        res.send(result);
                        res.end();
                    } else {
                        res.send({ result: 'empty' });
                        res.end();
                    }
    
                });
            });
        }
        else {
            res.render("login");
        }
    } catch (error) {
        logHelper.writeLog("/Cutting/Payroll_Search/GetName", error);
    }
});
app.post('/Cutting/Payroll_Search/GetTimeSheet', function (req, res) {
    if (req.isAuthenticated()) {
        var ID = req.body.ID;
        var date = req.body.date;
        var datefrom = req.body.datefrom;
        console.log(date, datefrom);
        con4.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "Select ROUND(SUM(WORK_HRS),2) AS WORK_HRS, ROUND(SUM(REG_HRS),2) AS REG_HRS, ROUND(SUM(OT15+OT20+OT30),2) as OT, ROUND(SUM(CD03),2) AS CD03, ROUND(SUM(CD08),2) AS CD08, ROUND(SUM(CD09),2) AS CD09 "
                + " from employee_timesheet where ID like '" + ID + "%' AND DATE<='" + date + "' AND DATE>='" + datefrom + "';"
            console.log(sql);
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                console.log(result);
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }

            });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Skip', function (req, res) {
    if (req.isAuthenticated()) {
        var file = req.body.file;
        var date = req.body.date;
        var QC = req.body.QC;
        if (QC == '') {
            QC = '999999';
        }
        console.log('skip update btn');
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("Update employee_scanticket set IS_FULL='100', QC='" + QC + "', MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "' where FILE='" + file + "';",
                function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    console.log('update_done');
                    res.send({ result: 'done' });
                    res.end();
                });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Dismiss_error', function (req, res) {
    if (req.isAuthenticated()) {
        var file = req.body.fileName;
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        var timeUpdate = localISOTime.replace(/T/, ' ').replace(/\..+/, '');
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("Update bundleticket_error set MODIFIED='" + req.user.username + "', TimeModified='" + timeUpdate + "' where FILE='" + file + "';",
                function (err, result, fields) {
                    connection.release();
                    if (err) throw err;
                    res.send({ result: 'done' });
                    res.end();
                });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Bundle', function (req, res) {
    if (req.isAuthenticated()) {
        var file = req.body.file;
        var date = req.body.date;
        var bundle = req.body.bundle;
        console.log(file, date);
        var bundle_read;
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("SELECT TICKET, QC, EMPLOYEE FROM employee_scanticket where FILE='" + file + "' or TICKET like '" + bundle + "%';", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    bundle_read = result;
                    console.log(bundle_read[0].TICKET.substring(0, 6));
                    var bundle1 = bundle_read[0].TICKET.substring(0, 6);
                    var bundle = bundle1;
                    if (bundle_read.length > 2) {
                        var bundle2 = bundle_read[1].TICKET.substring(0, 6);
                        var bundle3 = bundle_read[2].TICKET.substring(0, 6);
                        if (bundle1 == bundle2 || bundle1 == bundle3)
                            bundle = bundle1;
                        if (bundle1 != bundle2 && bundle2 == bundle3)
                            bundle = bundle2;
                    }
                    console.log(bundle);
                    var QC = bundle_read[0].QC;
                    con5.getConnection(function (err, connection) {
                        if (err) {
                            connection.release();
                            throw err;
                        }
                        var sql = "";
                        if (date < "20200601")
                            sql = "SELECT bundleticket_active.TICKET "
                                + " from bundleticket_active left join employee_scanticket "
                                + " on bundleticket_active.TICKET=employee_scanticket.TICKET "
                                + " where bundleticket_active.TICKET like '" + bundle + "%' and employee_scanticket.TICKET is null;";
                        else
                            sql = "SELECT TICKET from bundleticket_active where TICKET like '" + bundle + "%';"
                        connection.query(sql, function (err, result, fields) {
                            // connection.query(sql, function (err, result, fields) {
                            connection.release();
                            if (err) throw err;
                            if (result.length > 0) {
                                res.send({ bundle_read: bundle_read, bundle_full: result, QC: QC });
                                res.end();
                            } else {
                                res.send({ bundle_read: bundle_read, bundle_full: 'empty', QC: QC })
                                res.end();
                            }
                        });
                    });
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/BundleNew', function (req, res) {
    if (req.isAuthenticated()) {
        var file = req.body.file;
        var date = req.body.date;
        var bundle = req.body.bundle;
        console.log(file, date);
        var bundle_read;
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT Temp3.TICKET, scan.QC, scan.EMPLOYEE FROM employee_scanticket scan RIGHT JOIN "
                + " (SELECT TICKET, active2.FILE FROM bundleticket_active active2 INNER JOIN (SELECT distinct active.FILE FROM bundleticket_active active "
                + " INNER JOIN (SELECT TICKET FROM employee_scanticket where FILE = '" + file + "') AS Temp1 "
                + " ON active.TICKET=Temp1.TICKET) AS Temp2 ON active2.`FILE`=Temp2.FILE) AS Temp3 ON Temp3.TICKET=scan.TICKET;"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0 && result.length < 20) {
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/BundleSearch', function (req, res) {
    if (req.isAuthenticated()) {
        var bundle = req.body.bundle;
        console.log(bundle);
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            connection.query("SELECT TICKET, EMPLOYEE, DATE, BUNDLE, OPERATION_CODE, EARNED_HOURS, WORK_LOT, FILE, MODIFIED, QC FROM employee_scanticket where TICKET like '" + bundle + "%';", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send({ result: result });
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    }
    else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/ID', function (req, res) {
    if (req.isAuthenticated()) {
        var id = req.body.id;
        var date = req.body.date;
        var datefrom = req.body.datefrom;
        console.log(date, datefrom);
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT e.TICKET, a.OPERATION_CODE, a.EARNED_HOURS, a.UNITS, a.WORK_LOT, a.SAH_ADJ, e.FILE "
                + " FROM employee_scanticket e inner join bundleticket_active a on e.TICKET=a.TICKET "
                + " where EMPLOYEE='" + id + "' and e.TimeUpdate>='" + datefrom + " 06:00:00' and e.TimeUpdate<='" + date + " 23:59:59'"
            // sql="SELECT BUNDLE, OPERATION_CODE, EARNED_HOURS, UNITS, WORK_LOT, FILE FROM"
            //     + " employee_scanticket where EMPLOYEE='"+id+"' and DATE<='"+date+"' and DATE>='"+datefrom+"'";
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Ticket', function (req, res) {
    var ticket = req.body.ticket;
    con5.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        connection.query("SELECT EMPLOYEE, DATE, FILE FROM"
            + " employee_scanticket where TICKET='" + ticket + "';", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
    });
});
app.post('/Cutting/Payroll_Search/Worklot', function (req, res) {
    var worklot = req.body.worklot;
    con5.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        // sql = "SELECT t1.*, r.NAME, r.OP_REG, r.NAMEGROUP FROM "
        //     + " (SELECT a.TICKET, a.OPERATION_CODE, s.EMPLOYEE, a.EARNED_HOURS, a.SAH_ADJ, a.UNITS FROM bundleticket_active a LEFT JOIN employee_scanticket s ON a.TICKET=s.TICKET "
        //     + " WHERE a.WORK_LOT='" + worklot + "' AND a.`FILE`!='0') t1 LEFT JOIN "
        //     + " (SELECT RIGHT(ID, 5) ID, NAME, OP_REG, NAMEGROUP from offstandard_employee_registed WHERE WEEK_REG='41') r ON t1.EMPLOYEE=r.ID ;";

        sql = "SELECT bundleticket_active.TICKET, bundleticket_active.CREATE_DATE, bundleticket_active.OPERATION_CODE, "
            + " bundleticket_active.EARNED_HOURS, bundleticket_active.UNITS, bundleticket_active.FILE, employee_scanticket.DATE, employee_scanticket.EMPLOYEE "
            + " FROM bundleticket_active left join employee_scanticket on bundleticket_active.TICKET=employee_scanticket.TICKET "
            + " where bundleticket_active.WORK_LOT='" + worklot + "' and bundleticket_active.TICKET not like '%0109' and bundleticket_active.TICKET not like '%0110' and bundleticket_active.TICKET not like '%0112';";
        // connection.query("SELECT BUNDLE, CREATE_DATE, OPERATION_CODE, EARNED_HOURS, UNITS, FILE FROM bundleticket_active"
        // +" where WORK_LOT='"+worklot+"';", function (err, result, fields) {
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                res.send(result);
                res.end();
            } else {
                var data = { result: 'empty' };
                res.send(data);
                res.end();
            }
        });
    });
});
app.post('/Cutting/Payroll_Search/AQL_detail', function (req, res) {
    var worklot = req.body.worklot;
    con5.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        sql = "SELECT * FROM "
            + " (SELECT TABLE_CODE, QC, IRR, EMPLOYEE, NO_IRR, NO_SAMPLE, FILE FROM cutting_system.aql_record WHERE WORK_LOT='" + worklot + "') t "
            + " LEFT JOIN (SELECT RIGHT(ID, 5) ID, NAME, OP_REG, NAMEGROUP from offstandard_employee_registed WHERE WEEK_REG='41') r "
            + " on t.EMPLOYEE=r.ID;";
        // connection.query("SELECT BUNDLE, CREATE_DATE, OPERATION_CODE, EARNED_HOURS, UNITS, FILE FROM bundleticket_active"
        // +" where WORK_LOT='"+worklot+"';", function (err, result, fields) {
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
app.post('/Cutting/Payroll_Search/WorklotSummary', function (req, res) {
    var worklot = req.body.worklot;
    worklot = worklot.substring(2);
    con5.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        sql = "select Temp1.TICKET as BUNDLE, FILE, COUNT(Temp1.TICKET) as ISSUE, COUNT(Temp2.TICKET) as EARN, COUNT(Temp3.TICKET) as IA, COUNT(Temp1.TICKET)-COUNT(Temp2.TICKET)-COUNT(Temp3.TICKET) as NOT_EARN from "
            + " (select TICKET, FILE from bundleticket_active where work_lot='" + worklot + "' and FILE!='0') as Temp1 "
            + " left join "
            + " (select TICKET from employee_scanticket where work_lot='" + worklot + "') as Temp2 on Temp1.TICKET=Temp2.TICKET "
            + " left join "
            + " (select TICKET from bundleticket_deactive where work_lot='" + worklot + "') as Temp3 on Temp1.TICKET=Temp3.TICKET "
            + " group by Temp1.FILE;";
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                res.send({ result: result });
                res.end();
            } else {
                var data = { result: 'empty' };
                res.send(data);
                res.end();
            }
        });
    });
});
app.post('/Cutting/Payroll_Search/Alert', function (req, res) {
    if (req.isAuthenticated()) {
        var date = req.body.date;
        var datefrom = req.body.datefrom;
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "SELECT TICKET, OLD_EMPLOYEE, OLD_FILE, NEW_EMPLOYEE, NEW_FILE, STATUS FROM bundleticket_alert WHERE OLD_TimeUpdate>='" + datefrom + " 00:00:00' and OLD_TimeUpdate<='" + date + " 23:59:59' "
                + " AND NEW_EMPLOYEE!=OLD_EMPLOYEE and MID(OLD_FILE, 7, 1)!=MID(NEW_FILE, 7, 1) AND HOUR(OLD_TimeUpdate)!=HOUR(New_TIMEUPDATE) and (STATUS='Y' or STATUS='N') order by status desc, OLD_FILE;"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    res.send({ result: 'empty' });
                    res.end();
                }
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Alert_Update_Status', function (req, res) {
    if (req.isAuthenticated()) {
        var ticket = req.body.ticket;
        var status = req.body.status;
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            sql = "update bundleticket_alert set STATUS='" + status + "' WHERE Ticket='" + ticket + "';"
            connection.query(sql, function (err, result, fields) {
                connection.release();
                if (err) throw err;
                res.send({ result: 'done' });
                res.end()
            });
        });
    } else {
        res.render("login");
    }
});
app.post('/Cutting/Payroll_Search/Update_Date_Scan', function (req, res) {
    if (req.isAuthenticated()) {
        var date = req.body.date;
        var file_name = req.body.file_name;
        con5.getConnection(function (err, connection) {
            if (err) {
                throw err;
            }
            for (var i = 0; i < file_name.length; i++) {
                file = file_name[i];
                console.log(file)
                // sql="update employee_scanticket set DATE='"+date+"' WHERE File='"+file+"';"
                // connection.query(sql, function (err, result, fields) {
                //     if (err) throw err;
                // });
            }
            connection.release();
            res.send({ result: 'done' });
            res.end();
        });
    } else {
        res.render("login");
    }
});
app.post("/Cutting/Payroll_Search/GroupReport", function (req, res) {
    var groupName = req.body.group;
    var shift = req.body.shift;
    var date = req.body.date;
    groupF = groupName.substring(0, 3);
    groupT = groupName.substring(4, 7);
    shift = shift.substring(0, 1);
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        var sql = "select t2.ID, t2.Name, t2.Line, OPERATION, BUNDLE, SAH from ( "
            + " select EMPLOYEE, bd.Operation_Code as OPERATION, COUNT(ac.Ticket) as Bundle, ROUND(SUM(ac.EARNED_HOURS),2) as SAH "
            + " from cutting_system.employee_scanticket ac left join cutting_system.bundleticket_active bd "
            + " on ac.TICKET=bd.TICKET "
            + " where DATE='" + date + "' and  ac.File like '" + groupF + groupT + shift + "%' "
            + " group by Employee, bd.OPERATION_Code order by bd.OPERATION_code) t1 inner join "
            + " (select RIGHT(ID,5) as EMPLOYEE, ID, Name, Line "
            + " from setup_emplist) as t2 on t1.EMPLOYEE=t2.EMPLOYEE ;"
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            if (result.length > 0) {
                // console.log(result);
                res.send(result);
                res.end();
            } else {
                res.send({ result: 'empty' });
                res.end();
            }
        });
    });
});
app.post("/Cutting/Payroll_Search/WipReport", function (req, res) {
    var shift = req.body.shift;
    var date = req.body.date;
    shift = shift.substring(0, 1);
    con2.getConnection(function (err, connection) {
        if (err) {
            throw err;
        }
        var sql = "select MACHINE, WORK_LOT, ASSORTLOT, OPERATION_CODE, ISSUES, SCANS, VAR, ISSUES_UNIT, SCANS_UNIT from "
            + " (select t3.WORK_LOT, d.SECTION, p.ASSORTLOT, p.MACHINE, OPERATION_CODE, count(issue) ISSUES, count(scan) SCANS, count(issue)-count(scan) as VAR, SUM(ISSUE_UNIT) ISSUES_UNIT, SUM(SCAN_UNIT) SCANS_UNIT from "
            + " (select t2.WORK_LOT, t2.TICKET as issue, t2.OPERATION_CODE, e.TICKET as scan, t2.UNITS as ISSUE_UNIT, e.UNITS as SCAN_UNIT from "
            + " (select t1.WORK_LOT, a.TICKET, a.OPERATION_CODE, a.UNITS from "
            + " (select distinct work_lot from cutting_system.employee_scanticket where FILE like '%" + shift + "_" + date + "%' and work_lot!='') t1 "
            + " inner join cutting_system.bundleticket_active a on t1.WORK_LOT=a.WORK_LOT) t2 left join cutting_system.employee_scanticket e on t2.TICKET=e.TICKET) t3 "
            + " left join erpsystem.data_cutpartcutting d on t3.WORK_LOT=d.WORK_LOT "
            + " left join (select * from erpsystem.setup_plancutting group by WLs) p on t3.WORK_LOT=p.WLs "
            + " group by work_lot, operation_code) t1 where SECTION is null order by Machine, AssortLot, WORK_LOT;"
        console.log(sql)
        connection.query(sql, function (err, result, fields) {
            connection.release();
            if (err) throw err;
            res.send(result);
            res.end();
        });
    });
});
//=====================================QC==================================================
app.get("/QC/QC", function (req, res) {
    res.render("QC/QC");
});
app.get("/QC/Endline", function (req, res) {
    res.render("QC/Endline");
});
app.get("/QC/Report", function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (result[0].Department == 'QA' || result[0].Department == 'IE') {
                res.render("QC/Report");
            } else {
                res.send("Bạn không có quyền truy cập vào đường link này!");
                res.end();
            }
        })
    } else {
        res.render("login");
    }
});
app.post('/QC/Report/Endline', function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (result[0].Department == 'QA' || result[0].Department == 'IE') {
                var datefrom = req.body.datefrom;
                var shift = req.body.shift;
                var options = {
                    mode: 'text',
                    pythonPath: 'python',
                    scriptPath: './public/Python/QC/Endline',
                    pythonOptions: ['-u'], // get print results in real-time
                    args: [datefrom, shift]
                };
                console.log('Processing QC Endline Report');
                let shell = new PythonShell('Endline.py', options);
                shell.on('message', function (message) {
                    console.log(message);
                    // res.setHeader("Content-type", "application/json")
                    res.send(message);
                    res.end();
                });
            }
        });
    } else {
        res.render("login");
    }
});
app.post('/QC/Endline/PlantSummary', function (req, res) {
    var date = req.body.date;
    con4.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("select employee_scanticket.PLANT, employee_scanticket.IRR, qc_irr_code.IRR_NAME, qc_irr_code.SOURCE, count(employee_scanticket.IRR) AS IRR_COUNT, count(distinct employee_scanticket.BUNDLE) AS BUNDLE_COUNT"
            + " from employee_scanticket left join qc_irr_code on employee_scanticket.IRR=qc_irr_code.ID"
            + " where WORK_LOT is not null and DATE='" + date + "' and"
            + " (TICKET not like '%100' or TICKET not like '%026' or TICKET not like '%116')"
            + " group by PLANT, IRR;", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    res.send(result);
                    res.end();
                } else {
                    var data = { result: 'empty' };
                    res.send(data);
                    res.end();
                }
            });
    });
});
app.post('/QC/Endline/FacemaskSummary', function (req, res) {
    var date = req.body.date;
    con4.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("select employee_scanticket.IRR, qc_irr_code.IRR_NAME, qc_irr_code.SOURCE, count(employee_scanticket.IRR) AS IRR_COUNT, count(distinct employee_scanticket.BUNDLE) AS BUNDLE_COUNT"
            + " from employee_scanticket left join qc_irr_code on employee_scanticket.IRR=qc_irr_code.ID"
            + " where WORK_LOT is not null and DATE='" + date + "' and STYLE='HBMSKE' and"
            + " (TICKET not like '%100' or TICKET not like '%026' or TICKET not like '%116')"
            + " group by IRR;", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    res.send(result);
                    res.end();
                } else {
                    var data = { result: 'empty' };
                    res.send(data);
                    res.end();
                }
            });
    });
});
app.post('/QC/Endline/MUWSummary', function (req, res) {
    var date = req.body.date;
    con4.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("select employee_scanticket.IRR, qc_irr_code.IRR_NAME, qc_irr_code.SOURCE, count(employee_scanticket.IRR) AS IRR_COUNT, count(distinct employee_scanticket.BUNDLE) AS BUNDLE_COUNT"
            + " from employee_scanticket left join qc_irr_code on employee_scanticket.IRR=qc_irr_code.ID"
            + " where WORK_LOT is not null and DATE='" + date + "' and STYLE!='HBMSKE' and"
            + " (TICKET not like '%100' or TICKET not like '%026' or TICKET not like '%116')"
            + " group by IRR;", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if (result.length > 0) {
                    // console.log(result);
                    res.send(result);
                    res.end();
                } else {
                    var data = { result: 'empty' };
                    res.send(data);
                    res.end();
                }
            });
    });
});
app.get("/QC/Documentation", function (req, res) {
    res.render("QC/Documentation");
});
app.get("/QC/Remark", function (req, res) {
    res.render("QC/Remark");
});
//=====================================WAREHOUSE==========================================
app.get("/Warehouse/Warehouse", function (req, res) {
    res.render("Warehouse/Warehouse");
});
app.get("/Warehouse/Phubai1", function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (req.user.username != 'dule4' && result[0].Department != 'LP') {
                res.send('You dont have permission to access this page!');
                res.end();
            }
            else res.render("Warehouse/Phubai1");
        });
    } else {
        res.render("login");
    }
});
app.get("/Warehouse/Phubai2", function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (req.user.username != 'dule4' && result[0].Department != 'LP') {
                res.send('You dont have permission to access this page!');
                res.end();
            }
            else res.render("Warehouse/Phubai2");
        });
    } else {
        res.render("login");
    }
});
app.get("/Warehouse/PhubaiIE", function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (req.user.username != 'dule4' && result[0].Department != 'LP') {
                res.send('You dont have permission to access this page!');
                res.end();
            }
            else res.render("Warehouse/PhubaiIE");
        });
    } else {
        res.render("login");
    }
});
app.get("/Warehouse/Cutting", function (req, res) {
    res.render("Warehouse/Cutting");
});
app.get("/Warehouse/Cutpart", function (req, res) {
    if (req.isAuthenticated()) {
        get_dept(req.user.username, function (result) {
            if (req.user.username != 'dule4' && result[0].Department != 'LP') {
                res.send('You dont have permission to access this page!');
                res.end();
            }
            res.render("Warehouse/Cutpart");
        });
    } else {
        res.render("login");
    }
});
app.get("/Warehouse/CutpartInfo", function (req, res) {
    res.render("Warehouse/CutpartInfo");
});
//=====================================IE==================================================
app.get("/IE/IE_page", function (request, res) {
    res.render("IE/IE_page");
    // var group_list;
    // con2.getConnection(function(err, connection){
    //     if (err) {
    //         connection.release();
    //         throw err;
    //     }
    //     connection.query("SELECT distinct NameGroup FROM setup_location where Location like 'Line%';", function (err, result, fields) {
    //         connection.release();
    //         if (err) throw err;
    //         group_list=result;
    //         res.render("IE/IE_page", {group_list: group_list});
    //     });
    // });
});
app.post("/IE/group_query", function (request, response) {
    var groupName = request.body.group;
    var week = request.body.week.substring(1, 3);
    con1.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("SELECT distinct Fabric FROM setup_group_fabric where Line='" + groupName + "' and Week='" + week + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            var wc_list = result;
            response.send(wc_list);
            response.end();
        });
    })

});
app.post("/IE/style_query", function (request, response) {
    var groupName = request.body.group;
    var wc = request.body.wc;
    var week = request.body.week.substring(1, 3);
    con1.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("SELECT distinct Style FROM setup_group_fabric where Line='" + groupName + "' and Fabric='" + wc + "' and Week='" + week + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            var style_list = result;
            response.send(style_list);
            response.end();
        });
    })
});
app.post("/IE/size_query", function (request, response) {
    var groupName = request.body.groupName;
    var style = request.body.style;
    var wc = request.body.wc;
    var week = request.body.week.substring(1, 3);
    con1.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            throw err;
        }
        connection.query("SELECT distinct Size FROM setup_group_fabric where Line='" + groupName + "' and Fabric='" + wc + "' and Week='" + week + "' and Style='" + style + "';", function (err, result, fields) {
            connection.release();
            if (err) throw err;
            var size_list = result;
            response.send(size_list);
            response.end();
        });
    })

});
app.post("/IE/load_emp_data", function (request, response) {
    var groupName = request.body.group;
    var wc = request.body.wc;
    var shift = request.body.shift;
    var week = request.body.week.substring(1, 3);
    var options = {
        mode: 'json',
        pythonPath: 'python',
        scriptPath: './public/Python/IE/LineBalancing',
        pythonOptions: ['-u'], // get print results in real-time
        args: [groupName, wc, shift, week]
    };
    console.log("load emplist running");
    let shell = new PythonShell('get_employee_data.py', options);
    shell.on('message', function (message) {
        response.setHeader("Content-Type", "application/json");
        response.send(message);
        response.end();
    });
});
app.post("/IE/get_lineBalancing", async function (request, response) {
    var style = request.body.style;
    var size = request.body.size;
    var emp_list = JSON.stringify(request.body.emp_list);
    var options = {
        mode: 'json',
        pythonPath: 'python',
        scriptPath: './public/Python/IE/LineBalancing',
        pythonOptions: ['-u'], // get print results in real-time
        args: [style, size, emp_list]
    };
    let shell = new PythonShell('lineBalancing.py', options);
    shell.on('message', function (message) {
        response.setHeader("Content-Type", "application/json");
        response.send(message);
        response.end();
    });

});
app.disable('view cache');
//===========================================Schedular Task=====================================
// var cronPythonScanTicket = require('node-cron');
var cronUpdateTicket = require('node-cron');
var cronUpdateDeactive = require('node-cron');
var cronUpdateTicketCutting = require('node-cron');
var cronUpdateDeactiveCutting = require('node-cron');
const { query, request } = require('express');
const { info, time, group } = require('console');
const { default: User } = require('./models/user.model');
/*
cronPythonScanTicket: scan folder Pilot will start at 5:30AM and run continously until 23:15 PM
*/
// cronUpdateTicket.schedule('0 */5 * * * *', function () {
//     var yesterdate = new Date();
//     yesterdate.setDate(yesterdate.getDate() - 7);
//     var localISOTime_yesterday = yesterdate.toISOString().slice(0, -1).substr(0, 10);
//     // year=localISOTime_yesterday.substring(0,4);
//     // month=localISOTime_yesterday.substring(5,7);
//     // day=localISOTime_yesterday.substring(8,10);
//     date = localISOTime_yesterday;// year+month+day;
//     console.log('start Update Ticket information ', date);
//     sql = "UPDATE pr2k.employee_scanticket employee_scanticket, pr2k.bundleticket_active bundleticket_active"
//         + " SET employee_scanticket.PLANT=bundleticket_active.PLANT, employee_scanticket.EARNED_HOURS=bundleticket_active.EARNED_HOURS,"
//         + " employee_scanticket.STYLE=bundleticket_active.STYLE,  employee_scanticket.COLOR=bundleticket_active.COLOR,"
//         + " employee_scanticket.SIZE=bundleticket_active.SIZE, employee_scanticket.UNITS=bundleticket_active.UNITS,"
//         + " employee_scanticket.OPERATION=bundleticket_active.OPERATION, employee_scanticket.WORK_LOT=bundleticket_active.WORK_LOT"
//         + " WHERE employee_scanticket.TICKET=bundleticket_active.TICKET AND employee_scanticket.UNITS IS NULL and employee_scanticket.TimeUpdate>='" + date + " 00:00:00' ;"
//     con4.getConnection(function (err, connection) {
//         if (err) {
//             throw err;
//         }
//         connection.query(sql, function (err, result, fields) {
//             connection.release();
//             console.log('update Ticket Done');
//             if (err) throw err;
//         });
//     });
// });

// cronUpdateDeactive.schedule('0 */5 * * * *', function () {
//     console.log('start Update Deactive');
//     sql = "UPDATE pr2k.bundleticket_deactive bundleticket_deactive, pr2k.bundleticket_active bundleticket_active "
//         + " SET bundleticket_deactive.WORK_LOT=bundleticket_active.WORK_LOT "
//         + " WHERE bundleticket_deactive.TICKET=bundleticket_active.TICKET AND bundleticket_deactive.WORK_LOT='';"
//     con4.getConnection(function (err, connection) {
//         if (err) {
//             connection.release();
//             throw err;
//         }
//         connection.query(sql, function (err, result, fields) {
//             connection.release();
//             console.log('update Ticket Deactive');
//             if (err) throw err;
//         });
//     });
// });

// cronUpdateTicketCutting.schedule('0 */7 * * * *', function () {
//     var yesterdate = new Date();
//     yesterdate.setDate(yesterdate.getDate() - 7);
//     var localISOTime_yesterday = yesterdate.toISOString().slice(0, -1).substr(0, 10);
//     // year=localISOTime_yesterday.substring(0,4);
//     // month=localISOTime_yesterday.substring(5,7);
//     // day=localISOTime_yesterday.substring(8,10);
//     date = localISOTime_yesterday;// year+month+day;
//     console.log('start Update Ticket information ', date);
//     sql = "UPDATE cutting_system.employee_scanticket employee_scanticket, cutting_system.bundleticket_active bundleticket_active"
//         + " SET employee_scanticket.PLANT=bundleticket_active.PLANT, employee_scanticket.EARNED_HOURS=bundleticket_active.EARNED_HOURS,"
//         + " employee_scanticket.STYLE=bundleticket_active.STYLE,  employee_scanticket.COLOR=bundleticket_active.COLOR,"
//         + " employee_scanticket.SIZE=bundleticket_active.SIZE, employee_scanticket.UNITS=bundleticket_active.UNITS,"
//         + " employee_scanticket.OPERATION=bundleticket_active.OPERATION, employee_scanticket.WORK_LOT=bundleticket_active.WORK_LOT"
//         + " WHERE employee_scanticket.TICKET=bundleticket_active.TICKET AND employee_scanticket.UNITS IS NULL and employee_scanticket.TimeUpdate>='" + date + " 00:00:00' ;"
//     con5.getConnection(function (err, connection) {
//         if (err) {
//             throw err;
//         }
//         connection.query(sql, function (err, result, fields) {
//             connection.release();
//             console.log('update Ticket Cutting Done');
//             if (err) throw err;
//         });
//     });
// });

// cronUpdateDeactiveCutting.schedule('0 */7 * * * *', function () {
//     console.log('start Update Deactive');
//     sql = "UPDATE cutting_system.bundleticket_deactive bundleticket_deactive, cutting_system.bundleticket_active bundleticket_active "
//         + " SET bundleticket_deactive.WORK_LOT=bundleticket_active.WORK_LOT "
//         + " WHERE bundleticket_deactive.TICKET=bundleticket_active.TICKET AND bundleticket_deactive.WORK_LOT='';"
//     con5.getConnection(function (err, connection) {
//         if (err) {
//             connection.release();
//             throw err;
//         }
//         connection.query(sql, function (err, result, fields) {
//             connection.release();
//             console.log('update Ticket Cutting Deactive');
//             if (err) throw err;
//         });
//     });
// });

// Crontab Cutting Realtime
// cronUpdateTicket.schedule('*/5 * * * * *', function () {
//     var yesterdate = new Date();
//     // yesterdate.setDate(yesterdate.getDate() - 7);
//     yesterdate.setDate(yesterdate.getDate() - 1);
//     var localISOTime_yesterday = yesterdate.toISOString().slice(0, -1).substr(0, 10);
//     // year=localISOTime_yesterday.substring(0,4);
//     // month=localISOTime_yesterday.substring(5,7);
//     // day=localISOTime_yesterday.substring(8,10);
//     date = localISOTime_yesterday;// year+month+day;
//     console.log('start Update Ticket information ', date);
//     sql = "UPDATE employee_scanticket employee_scanticket, bundleticket_active bundleticket_active"
//         + " SET employee_scanticket.PLANT=bundleticket_active.PLANT, employee_scanticket.EARNED_HOURS=bundleticket_active.EARNED_HOURS,"
//         + " employee_scanticket.STYLE=bundleticket_active.STYLE,  employee_scanticket.COLOR=bundleticket_active.COLOR,"
//         + " employee_scanticket.SIZE=bundleticket_active.SIZE, employee_scanticket.UNITS=bundleticket_active.UNITS,"
//         + " employee_scanticket.OPERATION=bundleticket_active.OPERATION, employee_scanticket.WORK_LOT=bundleticket_active.WORK_LOT"
//         + " WHERE employee_scanticket.TICKET=bundleticket_active.TICKET AND employee_scanticket.UNITS IS NULL and employee_scanticket.TimeUpdate>='" + date + " 00:00:00' ;"
//     con5.getConnection(function (err, connection) {
//         if (err) {
//             throw err;
//         }
//         connection.query(sql, function (err, result, fields) {
//             connection.release();
//             console.log('update Ticket Done');
//             if (err) throw err;
//         });
//     });
// });
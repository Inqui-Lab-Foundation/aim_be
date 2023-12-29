import { badRequest, internal, notFound } from "boom";
import * as csv from "fast-csv";
import { NextFunction, Request, Response } from "express";
import fs, { stat } from 'fs';
import { any, date } from "joi";
import path from 'path';
import { speeches } from "../configs/speeches.config";
import dispatcher from "../utils/dispatch.util";
import ValidationsHolder from "../validations/validationHolder";
import { videoSchema, videoUpdateSchema } from "../validations/video.validations";
import BaseController from "./base.controller";
import { organizationCheckSchema, organizationRawSchema, organizationSchema, organizationUpdateSchema, uniqueCodeCheckSchema } from "../validations/organization.validations";
import authService from "../services/auth.service";
import validationMiddleware from "../middlewares/validation.middleware";
import { Op, QueryTypes } from "sequelize";
import { constant } from "lodash";
import { constents } from "../configs/constents.config";
import db from "../utils/dbconnection.util";
import { organization } from "../models/organization.model";

export default class OrganizationController extends BaseController {

    model = "organization";
    authService: authService = new authService;

    protected initializePath(): void {
        this.path = '/organizations';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(organizationSchema, organizationUpdateSchema);
    }
    protected initializeRoutes(): void {
        this.router.post(`${this.path}/bulkUpload`, this.bulkUpload.bind(this));
        this.router.get(`${this.path}/districts`, this.getGroupByDistrict.bind(this));
        this.router.get(`${this.path}/states`, this.getGroupByState.bind(this));
        this.router.get(`${this.path}/pinCode`, this.getGroupBypinCode.bind(this));
        this.router.get(`${this.path}/ATLCode`, this.getGroupByATLCode.bind(this));
        this.router.post(`${this.path}/checkOrg`, validationMiddleware(organizationCheckSchema), this.checkOrgDetails.bind(this));
        this.router.post(`${this.path}/createOrg`, validationMiddleware(organizationRawSchema), this.createOrg.bind(this));
        this.router.post(`${this.path}/login`,this.login.bind(this));
        this.router.get(`${this.path}/logout`,this.logout.bind(this));
        this.router.put(`${this.path}/changePassword`, this.changePassword.bind(this));
        this.router.post(`${this.path}/checkUniqueCode`, validationMiddleware(uniqueCodeCheckSchema), this.checkUniqueDetails.bind(this));
        super.initializeRoutes();
    };

    private async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const result = await this.authService.orglogin(req.body);
            if (!result) {
                return res.status(404).send(dispatcher(res, result, 'error', speeches.USER_NOT_FOUND));
            }
            else if (result.error){
                return res.status(403).send(dispatcher(res,result,'error'));
            }
            else {
                return res.status(200).send(dispatcher(res, result.data, 'success', speeches.USER_LOGIN_SUCCESS));
            }
        } catch (error) {
            return res.status(401).send(dispatcher(res, error, 'error', speeches.USER_RISTRICTED, 401));
        }
    }

    private async logout(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        const result = await this.authService.orglogout(req.body, res);
        if (result.error) {
            next(result.error);
        } else {
            return res.status(200).send(dispatcher(res, speeches.LOGOUT_SUCCESS, 'success'));
        }
    }

    private async changePassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        const result = await this.authService.orgchangePassword(req.body, res);
        if (!result) {
            return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
        } else if (result.error) {
            return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
        }
        else if (result.match) {
            return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_PASSWORD));
        } else {
            return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
        }
    }

    protected async getData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if(res.locals.role !== 'ADMIN'){
            return res.status(401).send(dispatcher(res,'','error', speeches.ROLE_ACCES_DECLINE,401));
        } 
        try {
            let data: any;
            const { model, id } = req.params;
            let newREQQuery : any = {}
            if(req.query.Data){
                let newQuery : any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery  = JSON.parse(newQuery);
            }else{
                newREQQuery = req.query;
            }
            const paramStatus: any = newREQQuery.status;
            if (model) {
                this.model = model;
            };
            // pagination
            const { page, size, status } = newREQQuery;
            // let condition = status ? { status: { [Op.like]: `%${status}%` } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            const where: any = {};
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.organization_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    addWhereClauseStatusPart = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    whereClauseStatusPartLiteral = `status = "${paramStatus}"`
                    addWhereClauseStatusPart = true;
                }
            } else if (paramStatus === 'NOTACTIVE') {
                whereClauseStatusPart = { status: { [Op.in]: ['INACTIVE', 'NEW'] } }
            } else {
                whereClauseStatusPart = { "status": ['ACTIVE', 'NEW'] };
                whereClauseStatusPartLiteral = `status = "ACTIVE"`
                addWhereClauseStatusPart = true;
            };
            if (id) {
                const newParamId = await this.authService.decryptGlobal(req.params.id);
                where[`${this.model}_id`] = newParamId;
                data = await this.crudService.findOne(modelClass, {
                    where: {
                        [Op.and]: [
                            whereClauseStatusPart,
                            where
                        ]
                    }
                });
            } else {
                try {
                    const responseOfFindAndCountAll = await this.crudService.findAndCountAll(modelClass, {
                        where: {
                            [Op.and]: [
                                whereClauseStatusPart
                            ]
                        },
                        limit, offset
                    })
                    const result = this.getPagingData(responseOfFindAndCountAll, page, limit);
                    data = result;
                } catch (error: any) {
                    console.log(error)
                    //  res.status(500).send(dispatcher(res,data, 'error'))
                    next(error)
                }
            }
            // if (!data) {
            //     return res.status(404).send(dispatcher(res,data, 'error'));
            // }
            if (!data || data instanceof Error) {
                if (data != null) {
                    throw notFound(data.message)
                } else {
                    throw notFound()
                }
                res.status(200).send(dispatcher(res, null, "error", speeches.DATA_NOT_FOUND));
                // if(data!=null){
                //     throw 
                (data.message)
                // }else{
                //     throw notFound()
                // }
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error) {
            console.log(error)
            next(error);
        }
    }

    private async checkOrgDetails(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        const org = await this.authService.checkOrgDetails(req.body.organization_code);
        if (!org) {
            res.status(400).send(dispatcher(res, null, 'error', speeches.BAD_REQUEST))
        } else {
            res.status(200).send(dispatcher(res, org, 'success', speeches.FETCH_FILE));
        }
    }
    private async getGroupByDistrict(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let response: any = [];
            let newREQQuery : any = {}
            if(req.query.Data){
                let newQuery : any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery  = JSON.parse(newQuery);
            }else{
                newREQQuery = req.query;
            }
            const { state } = newREQQuery;
            const { model } = req.params;
            if (model) {
                this.model = model;
            };
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            let objWhereClauseStatusPart = this.getWhereClauseStatsPart(req);
            let result: any =[];
            if(state){
                result = await this.crudService.findAll(modelClass, {
                    attributes: [
                        'district'
                    ],
                    where: {
                        [Op.and]: [
                            objWhereClauseStatusPart.whereClauseStatusPart,{'state':state}
                        ]
                    },
                    group: ['district']
                });

            }else{
                result = await this.crudService.findAll(modelClass, {
                    attributes: [
                        'district'
                    ],
                    where: {
                        [Op.and]: [
                            objWhereClauseStatusPart.whereClauseStatusPart
                        ]
                    },
                    group: ['district']
                });
                response.push('All Districts');
            }
            
            result.forEach((obj: any) => {
                response.push(obj.dataValues.district)
            });
            return res.status(200).send(dispatcher(res, response, 'success'));
        } catch (error) {
            console.log(error)
            next(error);
        }
    }
    private async getGroupByState(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let response: any = [];
            const { model } = req.params;
            if (model) {
                this.model = model;
            };
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            let objWhereClauseStatusPart = this.getWhereClauseStatsPart(req);
            const result = await this.crudService.findAll(modelClass, {
                attributes: [
                    'state'
                ],
                where: {
                    [Op.and]: [
                        objWhereClauseStatusPart.whereClauseStatusPart
                    ]
                },
                group: ['state'],
                order:['state']
            });
            response.push('All States');
            result.forEach((obj: any) => {
                response.push(obj.dataValues.state)
            });
            return res.status(200).send(dispatcher(res, response, 'success'));
        } catch (error) {
            console.log(error)
            next(error);
        }
    }
    private async getGroupBypinCode(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let response: any = [];
            let newREQQuery : any = {}
            if(req.query.Data){
                let newQuery : any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery  = JSON.parse(newQuery);
            }else{
                newREQQuery = req.query;
            }
            const { district } = newREQQuery;
            const { model } = req.params;
            if (model) {
                this.model = model;
            };
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            let objWhereClauseStatusPart = this.getWhereClauseStatsPart(req);
                const result = await this.crudService.findAll(modelClass, {
                    attributes: [
                        'pin_code'
                    ],
                    where: {
                        [Op.and]: [
                            objWhereClauseStatusPart.whereClauseStatusPart,{'district': district }
                        ]
                    },
                    group: ['pin_code']
                });
                result.forEach((obj: any) => {
                    response.push(obj.dataValues.pin_code)
                });
        
            return res.status(200).send(dispatcher(res, response, 'success'));
        } catch (error) {
            console.log(error)
            next(error);
        }
    }
    private async getGroupByATLCode(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let response: any = [];
            let newREQQuery : any = {}
            if(req.query.Data){
                let newQuery : any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery  = JSON.parse(newQuery);
            }else{
                newREQQuery = req.query;
            }
            const { pin_code } = newREQQuery;
            const { model } = req.params;
            if (model) {
                this.model = model;
            };
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            let objWhereClauseStatusPart = this.getWhereClauseStatsPart(req);
                const result = await this.crudService.findAll(modelClass, {
                    attributes: [
                        'organization_code',
                        'organization_name'
                    ],
                    where: {
                        [Op.and]: [
                            objWhereClauseStatusPart.whereClauseStatusPart,{'pin_code': pin_code },{'category':'ATL'}
                        ]
                    }
                });
            return res.status(200).send(dispatcher(res, result, 'success'));
        } catch (error) {
            console.log(error)
            next(error);
        }
    }
    private async createOrg(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        // console.log(req.body);
        let newREQQuery : any = {}
        if(req.query.Data){
            let newQuery : any = await this.authService.decryptGlobal(req.query.Data);
            newREQQuery  = JSON.parse(newQuery);
        }else{
            newREQQuery = req.query;
        }
        const {nonatlcode} = newREQQuery;
        if(nonatlcode){
            const orgcode = req.body.organization_code;
            const findOrgCode  = await db.query(`SELECT count(*) as orgCount  FROM organizations where organization_code like '${orgcode}-%';`,{ type: QueryTypes.SELECT });
            const countINcrement = parseInt(Object.values(findOrgCode[0]).toString(),10)+1;
            const ATLCode = `${orgcode}-${countINcrement}`
            req.body.organization_code = ATLCode;
            return this.createData(req, res, next);
        }else {
            return this.createData(req, res, next);
        }
        
    }
    private async checkUniqueDetails(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
       try{
        const org = await this.crudService.findOne(organization,{
            where: {
                unique_code: req.body.unique_code,
                status: {
                    [Op.or]: ['ACTIVE', 'NEW']
                }
            },
        })
        if (!org) {
            res.status(400).send(dispatcher(res, null, 'error', speeches.BAD_REQUEST))
        } else {
            res.status(200).send(dispatcher(res, org, 'success', speeches.FETCH_FILE));
        }
       }catch (error) {
        console.log(error)
        next(error);
    }
       
    }
}

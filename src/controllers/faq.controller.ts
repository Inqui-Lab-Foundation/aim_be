import { Request, Response, NextFunction } from "express";
import { constents } from "../configs/constents.config";
import { faqSchema,faqSchemaUpdateSchema } from "../validations/faq.validation";
import ValidationsHolder from "../validations/validationHolder";
import BaseController from "./base.controller";
import dispatcher from '../utils/dispatch.util';
import {faq} from '../models/faq.model';
import { translation } from "../models/translation.model";
import { badRequest } from 'boom';
import { speeches } from '../configs/speeches.config';

export default class FaqController extends BaseController {
    model = "faq";

    protected initializePath(): void {
        this.path = '/faqs';
    }
    protected initializeValidations(): void {
        this.validations =  new ValidationsHolder(faqSchema,faqSchemaUpdateSchema);
    }
    protected initializeRoutes(): void {
        //example route to add 
        // this.router.get(`${this.path}/`, this.getDataNew.bind(this));
        this.router.post(`${this.path}/addfaqandtranslation`, this.addfaq.bind(this));
        this.router.put(`${this.path}/editfaqandtranslation`, this.editfaq.bind(this));
        this.router.delete(`${this.path}/deletefaqandtranslation`, this.deletefaq.bind(this));
        this.router.get(`${this.path}/getbyCategoryid/:id`, this.getbyCategoryid.bind(this));
        super.initializeRoutes();
        
    }
    protected async getbyCategoryid(req: Request, res: Response, next: NextFunction) {  
        try{
            const id = req.params.id;
            if (!id) throw badRequest(speeches.FAQ_CATEGORY);

            const data = await this.crudService.findAll(faq,{
                where : {faq_category_id:id},
                order:[['faq_id','DESC']]
            });
            if (data instanceof Error) {
                throw data;
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        }catch (err) {
            next(err)
        } 
    }
   
    protected async addfaq(req: Request, res: Response, next: NextFunction) {  
        try{
            let result :any = {};
            if (!req.body.faq_category_id) throw badRequest(speeches.FAQ_CATEGORY);
            if (!req.body.question) throw badRequest(speeches.QUESTION_REQUIRED);
            if (!req.body.answer) throw badRequest(speeches.FAQ_ANSWER);

            const data = await this.crudService.create(faq,req.body);
            if (data instanceof Error) {
                throw data;
            }
            
            let blucktrandata = [
                {'table_name':'faq',
                'coloumn_name':'question',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'tn',
                'key':req.body.question},
                {'table_name':'faq',
                'coloumn_name':'answer',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'tn',
                'key':req.body.answer},
                {'table_name':'faq',
                'coloumn_name':'question',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'te',
                'key':req.body.question},
                {'table_name':'faq',
                'coloumn_name':'answer',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'te',
                'key':req.body.answer},
                {'table_name':'faq',
                'coloumn_name':'question',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'ka',
                'key':req.body.question},
                {'table_name':'faq',
                'coloumn_name':'answer',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'ka',
                'key':req.body.answer},
                {'table_name':'faq',
                'coloumn_name':'question',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'hi',
                'key':req.body.question},
                {'table_name':'faq',
                'coloumn_name':'answer',
                'index_no':data.dataValues.faq_id,
                'from_locale':'en',
                'to_locale':'hi',
                'key':req.body.answer}
            ]

            const tranData = await this.crudService.bulkCreate(translation,blucktrandata);
            if (tranData instanceof Error) {
                throw tranData;
            }

            result['faqdata']=data;
            result['trandata']=tranData;
            return res.status(200).send(dispatcher(res, result, 'success'));
        }catch (err) {
            next(err)
        } 
    }
    protected async editfaq(req: Request, res: Response, next: NextFunction) {  
        try{
            let result :any = {};
            const faqId = req.query.faq_id;
            if (!faqId) throw badRequest(speeches.FAQ_ID);
            if (!req.body.faq_category_id) throw badRequest(speeches.FAQ_CATEGORY);
            if (!req.body.question) throw badRequest(speeches.QUESTION_REQUIRED);
            if (!req.body.answer) throw badRequest(speeches.FAQ_ANSWER);

            const data = await this.crudService.update(faq,req.body,{where:{faq_id:faqId}});
            if (data instanceof Error) {
                throw data;
            }
            const updateQuestion = {'key':req.body.question};
            const updateAnswer = {'key':req.body.answer};

            const QuestionWhereTN = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'tn'}};
            const AnswerWhereTN = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'tn'}};
            const QuestionWhereKA = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'ka'}};
            const AnswerWhereKA = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'ka'}};
            const QuestionWhereTE = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'te'}};
            const AnswerWhereTE = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'te'}};
            const QuestionWhereHI = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'hi'}};
            const AnswerWhereHI = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'hi'}};

            const updatetranQstTN = await this.crudService.update(translation,updateQuestion,QuestionWhereTN);
            if (updatetranQstTN instanceof Error) {
                throw updatetranQstTN;
            }
            const updatetranANSTN = await this.crudService.update(translation,updateAnswer,AnswerWhereTN);
            if (updatetranANSTN instanceof Error) {
                throw updatetranANSTN;
            }
            const updatetranQstKA = await this.crudService.update(translation,updateQuestion,QuestionWhereKA);
            if (updatetranQstKA instanceof Error) {
                throw updatetranQstKA;
            }
            const updatetranANSKA = await this.crudService.update(translation,updateAnswer,AnswerWhereKA);
            if (updatetranANSKA instanceof Error) {
                throw updatetranANSKA;
            }
            const updatetranQstTE = await this.crudService.update(translation,updateQuestion,QuestionWhereTE);
            if (updatetranQstTE instanceof Error) {
                throw updatetranQstTE;
            }
            const updatetranANSTE = await this.crudService.update(translation,updateAnswer,AnswerWhereTE);
            if (updatetranANSTE instanceof Error) {
                throw updatetranANSTE;
            }
            const updatetranQstHI = await this.crudService.update(translation,updateQuestion,QuestionWhereHI);
            if (updatetranQstHI instanceof Error) {
                throw updatetranQstHI;
            }
            const updatetranANSHI = await this.crudService.update(translation,updateAnswer,AnswerWhereHI);
            if (updatetranANSHI instanceof Error) {
                throw updatetranANSHI;
            }
            

            result['faqdata']=data;
            result['updatetranQstTN']=updatetranQstTN;
            result['updatetranANSTN']=updatetranANSTN;
            result['updatetranQstKA']=updatetranQstKA;
            result['updatetranANSKA']=updatetranANSKA;
            result['updatetranQstTE']=updatetranQstTE;
            result['updatetranANSTE']=updatetranANSTE;
            result['updatetranQstHI']=updatetranQstHI;
            result['updatetranANSHI']=updatetranANSHI;
            return res.status(200).send(dispatcher(res, result, 'success'));
        }catch (err) {
            next(err)
        } 
    }
    protected async deletefaq(req: Request, res: Response, next: NextFunction) {  
        try{
            let result :any = {};
            const faqId = req.query.faq_id;
            if (!faqId) throw badRequest(speeches.FAQ_ID);

            const data = await this.crudService.delete(faq,{where:{faq_id:faqId}});
            if (data instanceof Error) {
                throw data;
            }
            const QuestionWhereTN = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'tn'}};
            const AnswerWhereTN = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'tn'}};
            const QuestionWhereKA = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'ka'}};
            const AnswerWhereKA = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'ka'}};
            const QuestionWhereTE = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'te'}};
            const AnswerWhereTE = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'te'}};
            const QuestionWhereHI = {where:{table_name:'faq',coloumn_name:'question',index_no:faqId,to_locale:'hi'}};
            const AnswerWhereHI = {where:{table_name:'faq',coloumn_name:'answer',index_no:faqId,to_locale:'hi'}};

            const updatetranQstTN = await this.crudService.delete(translation,QuestionWhereTN);
            if (updatetranQstTN instanceof Error) {
                throw updatetranQstTN;
            }
            const updatetranANSTN = await this.crudService.delete(translation,AnswerWhereTN);
            if (updatetranANSTN instanceof Error) {
                throw updatetranANSTN;
            }
            const updatetranQstKA = await this.crudService.delete(translation,QuestionWhereKA);
            if (updatetranQstKA instanceof Error) {
                throw updatetranQstKA;
            }
            const updatetranANSKA = await this.crudService.delete(translation,AnswerWhereKA);
            if (updatetranANSKA instanceof Error) {
                throw updatetranANSKA;
            }
            const updatetranQstTE = await this.crudService.delete(translation,QuestionWhereTE);
            if (updatetranQstTE instanceof Error) {
                throw updatetranQstTE;
            }
            const updatetranANSTE = await this.crudService.delete(translation,AnswerWhereTE);
            if (updatetranANSTE instanceof Error) {
                throw updatetranANSTE;
            }
            const updatetranQstHI = await this.crudService.delete(translation,QuestionWhereHI);
            if (updatetranQstHI instanceof Error) {
                throw updatetranQstHI;
            }
            const updatetranANSHI = await this.crudService.delete(translation,AnswerWhereHI);
            if (updatetranANSHI instanceof Error) {
                throw updatetranANSHI;
            }

            result['faqdata']=data;
            result['updatetranQstTN']=updatetranQstTN;
            result['updatetranANSTN']=updatetranANSTN;
            result['updatetranQstKA']=updatetranQstKA;
            result['updatetranANSKA']=updatetranANSKA;
            result['updatetranQstTE']=updatetranQstTE;
            result['updatetranANSTE']=updatetranANSTE;
            result['updatetranQstHI']=updatetranQstHI;
            result['updatetranANSHI']=updatetranANSHI;
            return res.status(200).send(dispatcher(res, result, 'success'));
        }catch (err) {
            next(err)
        } 
    }

    protected getData(req: Request, res: Response, next: NextFunction) {
        return super.getData(req,res,next,[],
                    {exclude:constents.SEQUELIZE_FLAGS.DEFAULT_EXCLUDE_SCOPE})
    }
    
}
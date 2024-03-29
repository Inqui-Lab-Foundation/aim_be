import BaseService from "./base.service";
import { QueryTypes } from "sequelize";
import db from "../utils/dbconnection.util";
export default class IdeaReportService extends BaseService {
    /**
     * truncates the data in idea_report tables and re entries
     * @returns Object 
     */
    executeIdeaDReport = async () => {
        const removeDtat = `truncate idea_report;`
        const CalData = `
       INSERT INTO idea_report(challenge_response_id,team_id,status,sdg,evaluation_status,final_result,response,sub_category)
SELECT 
    challenge_response_id,
    team_id,
    status,
    sdg,
    evaluation_status,
    final_result,
    response,
    sub_category
FROM
    challenge_responses
    WHERE
    status = 'SUBMITTED';`
        const teamData = ` 
           UPDATE idea_report AS d
           JOIN
       (SELECT 
           team_name, team_id, mentor_id
       FROM
           teams) AS s ON d.team_id = s.team_id 
   SET 
       d.team_name = s.team_name,
       d.mentor_id = s.mentor_id;`
        const mentorData = `
           UPDATE idea_report AS d
           JOIN
       (SELECT 
           full_name, mobile, mentor_id, organization_code,user_id
       FROM
           mentors) AS s ON d.mentor_id = s.mentor_id 
   SET 
       d.full_name = s.full_name,
       d.mobile = s.mobile,
       d.organization_code = s.organization_code,
       d.user_id = s.user_id;`
        const email = `
       UPDATE idea_report AS d
           JOIN
       (SELECT 
        user_id, username
    FROM
        users) AS s ON d.user_id = s.user_id 
   SET 
       d.email = s.username;`
        const orgData = `
           UPDATE idea_report AS d
           JOIN
       (SELECT 
           organization_code, organization_name, district, category,state,pin_code,address,unique_code
       FROM
           organizations) AS s ON d.organization_code = s.organization_code 
   SET 
       d.organization_name = s.organization_name,
       d.district = s.district,
       d.category = s.category,
       d.state = s.state,
       d.pin_code = s.pin_code,
       d.address = s.address,
       d.unique_code = s.unique_code;`
        const allstudent = `UPDATE idea_report AS d
          JOIN
      (SELECT 
          GROUP_CONCAT(full_name
                  SEPARATOR ', ') AS names,
              team_id
      FROM
          students
      GROUP BY team_id) AS s ON d.team_id = s.team_id 
  SET 
      d.students_names = s.names;`
        const overallS = `UPDATE idea_report AS d
           JOIN
       (SELECT 
           AVG(overall) AS overall_score,
               AVG(param_1) AS novelty,
               AVG(param_3) AS feasibility,
               AVG(param_4) AS scalability,
               AVG(param_5) AS sustainability,
               AVG(param_2) AS useful,
               COUNT(challenge_response_id) AS eval_count,
               challenge_response_id
       FROM
           evaluator_ratings
       GROUP BY challenge_response_id) AS s ON d.challenge_response_id = s.challenge_response_id 
   SET 
       d.overall_score = s.overall_score,
       d.novelty = s.novelty,
       d.feasibility = s.feasibility,
       d.scalability = s.scalability,
       d.sustainability = s.sustainability,
       d.useful = s.useful,
       d.eval_count = s.eval_count;`
        const qualityS = `UPDATE idea_report AS d
           JOIN
       (SELECT 
           (AVG(param_1) + AVG(param_2)) / 2 AS sum_params,
               challenge_response_id
       FROM
           evaluator_ratings
       GROUP BY challenge_response_id) AS s ON d.challenge_response_id = s.challenge_response_id 
   SET 
       d.quality_score = s.sum_params;`
        const feasibilityS = `UPDATE idea_report AS d
       JOIN
   (SELECT 
       (AVG(param_3) + AVG(param_4) + AVG(param_5)) / 3 AS sum_params,
           challenge_response_id
   FROM
       evaluator_ratings
   GROUP BY challenge_response_id) AS s ON d.challenge_response_id = s.challenge_response_id 
SET 
   d.feasibility_score = s.sum_params;`

        try {
            await db.query(removeDtat, {
                type: QueryTypes.RAW,
            });
            await db.query(CalData, {
                type: QueryTypes.RAW,
            });
            await db.query(teamData, {
                type: QueryTypes.RAW,
            });
            await db.query(mentorData, {
                type: QueryTypes.RAW,
            });
            await db.query(email, {
                type: QueryTypes.RAW,
            });
            await db.query(orgData, {
                type: QueryTypes.RAW,
            });
            await db.query(allstudent, {
                type: QueryTypes.RAW,
            });
            await db.query(overallS, {
                type: QueryTypes.RAW,
            });
            await db.query(qualityS, {
                type: QueryTypes.RAW,
            });
            await db.query(feasibilityS, {
                type: QueryTypes.RAW,
            });
            console.log('idea Report SQL queries executed successfully.');
        } catch (error) {
            console.error('Error executing SQL queries:', error);
        }
    };
}
<?php
/**
 * @license   http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author    Volker Theile <volker.theile@openmediavault.org>
 * @copyright Copyright (c) 2009-2013 Volker Theile
 * @copyright Copyright (c) 2013-2014 OpenMediaVault Plugin Developers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
require_once("openmediavault/object.inc");
require_once("openmediavault/config.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/rpcservice.inc");
require_once("openmediavault/notify.inc");

class OMVRpcServiceDDclient extends OMVRpcServiceAbstract
{

    public function getName()
    {
        return "DDclient";
    }

    private function getPluginName()
    {
        return strtolower( $this->getName() );
    }

    private function getXPath()
    {
        $path = sprintf( "//services/%s", $this->getPluginName() );
        return $path;
    }

    private function getEventMessagePath()
    {
        return sprintf("org.openmediavault.services.%s", $this->getPluginName());
    }

    public function initialize()
    {
        $this->registerMethod("getSettings");
        $this->registerMethod("setSettings");
        $this->registerMethod("doCheck");
        $this->registerMethod("deleteCache");
    }

    public function getSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext(
            $context,
            array( "role" => OMV_ROLE_ADMINISTRATOR )
        );

        // Get the configuration object.
        $object = $xmlConfig->get($this->getXPath());

        if (is_null($object))
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }

        // Modify the result object.
        $object["enable"]    = boolval($object["enable"]);
        $object["dssl"]      = boolval($object["dssl"]);
        $object["dwildcard"] = boolval($object["dwildcard"]);
        $object["dipcheck"]  = boolval($object["dipcheck"]);
        $object["nipcheck"]  = boolval($object["strict"]);
        $object["seconds"]   = intval($object["seconds"]);

        return $object;
    }

    public function setSettings($params, $context)
    {
        global $xmlConfig;

        // Validate the RPC caller context.
        $this->validateMethodContext(
            $context,
            array( "role" => OMV_ROLE_ADMINISTRATOR )
        );

        // Validate the parameters of the RPC service method.
        $this->validateMethodParams(
            $params,
            '{
                "type"        : "object",
                "properties"  : {
                    "enable"      : { "type" : "boolean" },
                    "ddns_type"   : { "type" : "string"},
                    "dusername"   : { "type" : "string"},
                    "dpassword"   : { "type" : "string"},
                    "dhostname"   : { "type" : "string"},
                    "dtype"       : { "type" : "string"},
                    "dssl"        : { "type" : "boolean"},
                    "dwildcard"   : { "type" : "boolean"},
                    "dipcheck"    : { "type" : "boolean"},
                    "nusername"   : { "type" : "string"},
                    "npassword"   : { "type" : "string"},
                    "nhostname"   : { "type" : "string"},
                    "nipcheck"    : { "type" : "boolean"},
                    "seconds"     : { "type" : "integer", "minimum" : 300, "maximum" : 2592000 }
                }
            }'
        );

        // Get the existing configuration object.
        $oldObject = $xmlConfig->get($this->getXPath());

        if (is_null($oldObject))
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
                $this->getXPath()
            );
        }

        // Update the configuration object.
        $object = array(
            "enable"     => array_boolval($params, "enable"),
            "ddns_type"  => $params["ddns_type"],
            "dusername"  => $params["dusername"],
            "dpassword"  => $params["dpassword"],
            "dhostname"  => $params["dhostname"],
            "dtype"      => $params["dtype"],
            "dssl"       => array_boolval($params, "dssl"),
            "dwildcard"  => array_boolval($params, "dwildcard"),
            "dipcheck"   => array_boolval($params, "dipcheck"),
            "nusername"  => $params["nusername"],
            "npassword"  => $params["npassword"],
            "nhostname"  => $params["nhostname"],
            "nipcheck"   => array_boolval($params, "nipcheck"),
            "seconds"    => $params["seconds"],
        );

        if ($xmlConfig->replace($this->getXPath(), $object) === false)
        {
            throw new OMVException(
                OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED
            );
        }

        // Notify configuration changes.
        $dispatcher = &OMVNotifyDispatcher::getInstance();

        $dispatcher->notify(
            OMV_NOTIFY_MODIFY,
            $this->getEventMessagePath(),
            $object
        );

        // Return the configuration object.
        return $object;
    }

    public function doCheck()
    {

        // Validate the RPC caller context.
        //$this->validateMethodContext($context, array(
        //    "role" => OMV_ROLE_ADMINISTRATOR
        //));

        // Create a background process.
        $bgStatusFilename = $this->createBgProcStatus();
        $pid = $this->fork();

        if ($pid > 0) {
            // Parent process.
            $this->initializeBgProcStatus($bgStatusFilename, $pid);
            return $bgStatusFilename;
        }

        // Child process.
        try {
            $bgOutputFilename = $this->createBgProcOutput();
            $this->updateBgProcStatus(
                $bgStatusFilename,
                "outputfilename",
                $bgOutputFilename
            );

            $cmd = sprintf(
                "export LANG=C; %s -daemon=0 -debug -verbose -noquiet 2>&1",
                 $this->getPluginName()
            );
            $this->exec($cmd, $output, $bgOutputFilename);
            $this->finalizeBgProcStatus($bgStatusFilename, $output);

        } catch (Exception $e) {
            $this->finalizeBgProcStatus($bgStatusFilename, "", $e);
            exit(1);
        }
    }

    public function deleteCache()
    {
        $cmd = sprintf(
            "export LANG=C; cp /dev/null /var/cache/%s/ddclient.cache 2>&1",
            $this->getPluginName()
        );

        if ($this->exec($cmd, $output) !== 0) {
            throw new OMVException(
                OMVErrorMsg::E_EXEC_FAILED,
                $cmd,
                implode("\n", $output)
            );
        }
    }
}

// Register the RPC service.
$rpcServiceMgr = &OMVRpcServiceMgr::getInstance();
$rpcServiceMgr->registerService(new OMVRpcServiceDDclient());